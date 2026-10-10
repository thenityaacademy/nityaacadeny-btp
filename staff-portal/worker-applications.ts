/**
 * Phase 4: authenticated applications to D1 (not yet deployed).
 * PDF/Google Sheets are deliberately NOT claimed complete in this phase.
 * Requires login session established by worker-auth.ts.
 */
type DB = D1Database;
type Kind = "admission" | "scholarship";
type Env = { DB: DB };
type Staff = { id:string; name:string };
const allowable = new Set([
  "studentName","fatherName","motherName","dob","gender","mobile","whatsapp",
  "email","aadhaar","address","district","state","pin","board12","year12",
  "percent12","lastQualification","course","session","totalFees",
  "practicalApplicable","practicalFee","hasReference","referenceName",
  "registrationDate","examDate","passed12","paymentMode","transactionRef"
]);
const fail = (error:string,status=400)=>Response.json({error},{status,headers:{"Cache-Control":"no-store"}});
const isDate = (x:string)=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x));
const str = (fields:Record<string,string>,key:string)=>fields[key]?.trim()||"";
function validate(kind:Kind,fields:Record<string,string>) {
  for(const k of Object.keys(fields)) if(!allowable.has(k)) return "Unsupported form field: "+k;
  for(const k of ["studentName","fatherName","dob","mobile","address","district"]) if(!str(fields,k)) return k+" is required";
  if(str(fields,"studentName").length>120 || str(fields,"address").length>700) return "Text too long";
  if(!isDate(str(fields,"dob"))) return "Invalid birth date";
  if(!/^[6-9]\d{9}$/.test(str(fields,"mobile"))) return "Enter a valid Indian mobile number";
  const aadhaar=str(fields,"aadhaar");
  if(aadhaar && !/^\d{12}$/.test(aadhaar)) return "Aadhaar must have 12 digits";
  for(const value of Object.values(fields)) if(value.length>1200) return "Field length exceeded";
  if(kind==="admission") {
    if(!str(fields,"course")) return "Select course";
    if(!/^\d+(\.\d{1,2})?$/.test(str(fields,"totalFees"))) return "Invalid total fees";
    if(str(fields,"practicalApplicable")==="yes"&&!/^\d+(\.\d{1,2})?$/.test(str(fields,"practicalFee"))) return "Enter practical fees";
    if(str(fields,"hasReference")==="yes"&&!str(fields,"referenceName")) return "Enter reference name";
  } else {
    if(str(fields,"passed12")!=="yes") return "ECCE scholarship requires 12th pass";
    if(!["cash","online"].includes(str(fields,"paymentMode"))) return "Select payment mode";
    if(str(fields,"examDate")&&!isDate(str(fields,"examDate"))) return "Invalid exam date";
  }
  return null;
}
function dateCode() { const d=new Date();return String(d.getUTCFullYear()); }
export async function saveStaffApplication(request:Request,env:Env,staff:Staff,kind:Kind):Promise<Response> {
  if((request.headers.get("content-length")||"0")!=="0" &&
     Number(request.headers.get("content-length"))>350_000) return fail("Form too large",413);
  if(!(request.headers.get("content-type")||"").startsWith("multipart/form-data;")) return fail("Expected multipart form");
  let form:FormData;
  try{form=await request.formData();}catch{return fail("Invalid form data");}
  const fields:Record<string,string>={};
  for(const [key,value] of form.entries()){
    if(key==="photo") {
      // R2 is disabled. Never accept a photo and silently discard it.
      if(value instanceof File && value.size) return fail("Photo uploads require private R2 storage; contact admin.",503);
      continue;
    }
    if(typeof value!=="string" || Object.hasOwn(fields,key)) return fail("Invalid or duplicate field");
    fields[key]=value;
  }
  const error=validate(kind,fields);
  if(error)return fail(error);
  if(kind==="admission"){
    const course=await env.DB.prepare("SELECT course_id,default_fee FROM staff_courses WHERE course_id=? AND active=1").bind(fields.course).first<{course_id:string;default_fee:number|null}>();
    if(!course)return fail("Selected course is inactive or unavailable");
  }
  const id=crypto.randomUUID();
  let formNumber:string;
  const fee=kind==="scholarship"?100:Number(fields.totalFees);
  if(kind==="scholarship"){
    // UPDATE RETURNING reserves unique number atomically. A failed insert may leave a gap,
    // but no duplicate number can be issued. Do not reset sequence backwards.
    const seq=await env.DB.prepare(
      "UPDATE registration_sequences SET next_number=next_number+1 WHERE sequence_key='scholarship' AND next_number<=end_number RETURNING prefix,next_number-1 AS issued_number"
    ).first<{prefix:string;issued_number:number}>();
    if(!seq)return fail("Scholarship registration series not configured or exhausted",503);
    formNumber=seq.prefix+seq.issued_number;
  } else formNumber="NA-ADM-"+dateCode()+"-"+id.slice(0,8).toUpperCase();
  // Student's Aadhaar and personal details stay inside D1; Google Sheet mappings must
  // explicitly restrict access and avoid publicly shareable files.
  const result=await env.DB.prepare(`INSERT INTO student_applications
    (id,kind,form_number,staff_id,student_name,mobile,course_id,fields_json,payment_mode,fee_amount,sheet_sync_status)
    VALUES (?,?,?,?,?,?,?,?,?,?,'pending')`).bind(
      id,kind,formNumber,staff.id,fields.studentName,fields.mobile,
      kind==="admission"?fields.course:"ecce",JSON.stringify(fields),
      kind==="scholarship"?fields.paymentMode:null,Math.round(fee*100)
    ).run();
  if(!result.success)return fail("Could not save application",500);
  await env.DB.prepare("INSERT INTO staff_activity(staff_id,action,reference_id) VALUES (?,?,?)").bind(staff.id,kind+"_submitted",id).run().catch(()=>{});
  return Response.json({success:true,number:formNumber,recordId:id,pdfStatus:"pending",sheetSyncStatus:"pending"},{status:201,headers:{"Cache-Control":"no-store"}});
}
