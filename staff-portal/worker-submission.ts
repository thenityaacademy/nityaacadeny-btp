/**
 * Final Staff application submission — behind STAFF_SUBMISSIONS_ENABLED.
 * Preconditions: authenticated Staff session, owned/private photo draft,
 * validated form, unique registration sequence, unchanged public website.
 * PDF bytes are served only through this authenticated Worker, never Drive URLs.
 */
import { driveReady,driveRequest,fromBase64,type DriveBridgeEnv } from "./worker-drive";
import { listStaffCourses } from "./worker-courses";
import { defaultFormEditor,sanitizeFormEditor } from "../src/data/staffFormEditor";

export type WorkflowEnv={DB:D1Database;STAFF_SUBMISSIONS_ENABLED?:string}&DriveBridgeEnv;
export type StaffIdentity={id:string;name:string};
type Kind="admission"|"scholarship";
type DocState="pending"|"ready";
type Stored={id:string;kind:Kind;form_number:string;staff_id:string;student_name:string;mobile:string;fields_json:string;
  photo_drive_id:string|null;pdf_drive_id:string|null;photo_draft_id:string;document_status:DocState;
  sheet_sync_status:string;created_at:string};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private,no-store","X-Content-Type-Options":"nosniff"}});
const bad=(message:string,status=400)=>json({error:message},status);
const idRE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isString=(v:unknown):v is string=>typeof v==="string";
const day=(v:string)=>/^\d{4}-\d\d-\d\d$/.test(v)&&Number.isFinite(Date.parse(v+"T00:00:00Z"))&&
  new Date(v+"T00:00:00Z").toISOString().slice(0,10)===v;
const year=(v:string)=>/^(19|20)\d{2}$/.test(v)&&+v<=new Date().getUTCFullYear()+1;
const percent=(v:string)=>v===""||/^\d+(?:\.\d{1,2})?$/.test(v)&&+v<=100;
const cost=(v:string)=>/^\d+(?:\.\d{1,2})?$/.test(v)&&+v<=10000000;
const allowed=new Set([
 "studentName","fatherName","motherName","dob","gender","aadhaar","mobile","whatsapp","email",
 "address","city","district","state","pin","passed10","board10","year10","percent10",
 "passed12","board12","year12","percent12","lastQualification","lastBoard","lastYear",
 "lastPercent","course","session","totalFees","practicalApplicable","practicalFee",
 "hasReference","referenceName","examDate","paymentMode","transactionRef"
]);
async function normalizedFields(env:WorkflowEnv,kind:Kind,input:unknown){
 if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Invalid form fields");
 const incoming=input as Record<string,unknown>;
 const editorRow=await env.DB.prepare("SELECT setting_value FROM portal_settings WHERE setting_key='formEditor'")
    .first<{setting_value:string}>();
 let editor=defaultFormEditor();
 if(editorRow?.setting_value){
  try{editor=sanitizeFormEditor(JSON.parse(editorRow.setting_value));}
  catch{throw Error("Admin form settings need correction before submissions");}
 }
 const definitions=editor[kind];
 const extras=new Map(definitions.extras.map(x=>[x.id,x]));
 const fields:Record<string,string>={};
 if(Object.keys(incoming).length>80)throw Error("Too many form fields");
 for(const [key,v] of Object.entries(incoming)){
  if(!allowed.has(key)&&!extras.has(key))throw Error("Unrecognized field "+key);
  if(!isString(v)||v.length>1000)throw Error("Invalid form value");
  if(allowed.has(key)&&definitions.fields[key]?.visible===false)continue;
  if(extras.has(key)&&extras.get(key)?.type==="select"&&v&&!extras.get(key)!.options.includes(v))
   throw Error("Invalid additional dropdown selection");
  fields[key]=v.trim();
 }
 for(const [k,def] of Object.entries(definitions.fields)){
  // Conditional 10th/12th fields are mandatory only for passed students.
  if(def.required&&def.visible&&!(kind==="admission"&&
   ((["board10","year10","percent10"].includes(k)&&fields.passed10==="no")||
    (["board12","year12","percent12"].includes(k)&&fields.passed12==="no")))&&!fields[k])
   throw Error(def.label+" is required");
 }
 for(const ex of definitions.extras)if(ex.required&&!fields[ex.id])throw Error(ex.label+" is required");
 for(const key of ["studentName","fatherName","dob","gender","aadhaar","mobile","address","district"])
  if(!fields[key])throw Error(key+" is required");
 if(!/^[2-9]\d{11}$/.test(fields.aadhaar))throw Error("Aadhaar must contain exactly 12 digits");
 if(!/^[6-9]\d{9}$/.test(fields.mobile))throw Error("Enter a valid Indian mobile number");
 if(fields.whatsapp&&!/^[6-9]\d{9}$/.test(fields.whatsapp))throw Error("Invalid WhatsApp mobile number");
 if(!day(fields.dob)||fields.dob>new Date().toISOString().slice(0,10))throw Error("Invalid date of birth");
 if(!["male","female","other","prefer-not-to-say"].includes(fields.gender))throw Error("Select gender");
 if(fields.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))throw Error("Invalid email address");
 if(fields.pin&&!/^\d{6}$/.test(fields.pin))throw Error("PIN Code must have 6 digits");
 if(fields.studentName.length>120||fields.address.length>700)throw Error("Student name or address too long");
 if(kind==="admission"){
  if(!["yes","no"].includes(fields.passed10)||!["yes","no"].includes(fields.passed12))
   throw Error("Select 10th and 12th pass status");
  for(const [grade,passed] of [["10","passed10"],["12","passed12"]] as const){
   if(fields[passed]==="no"){
    for(const key of ["board"+grade,"year"+grade,"percent"+grade])delete fields[key];
   }else if(!fields["board"+grade]||!year(fields["year"+grade]||"")||!percent(fields["percent"+grade]||"")){
    throw Error("Enter correct "+grade+"th board, year and percentage");
   }
  }
  if(!fields.course)throw Error("Course is required");
  if(!cost(fields.totalFees||""))throw Error("Total fee must be a valid amount");
  if(fields.practicalApplicable==="yes"&&!cost(fields.practicalFee||""))throw Error("Enter valid practical fee");
  if(fields.hasReference==="yes"&&!fields.referenceName)throw Error("Reference name is required");
  const courses=await listStaffCourses(env);
  const course=courses.find(c=>c.id===fields.course&&c.active);
  if(!course)throw Error("Selected course is inactive or unavailable");
  fields.courseName=course.name;
 }else{
  fields.passed12="yes";
  if(!year(fields.year12||"")||!fields.lastQualification)
   throw Error("Scholarship requires 12th passing year and last qualification");
  if(!["cash","online"].includes(fields.paymentMode))throw Error("Select scholarship payment mode");
  if(fields.examDate&&!day(fields.examDate))throw Error("Invalid exam date");
  fields.registrationDate=new Intl.DateTimeFormat("en-CA",{
   timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"
  }).format(new Date());
  fields.course="ECCE Scholarship";fields.registrationFee="100";
 }
 return fields;
}
async function ownedApplication(env:WorkflowEnv,staff:StaffIdentity,recordId:string){
 return env.DB.prepare(
  "SELECT id,kind,form_number,staff_id,student_name,mobile,fields_json,"+
  "photo_drive_id,pdf_drive_id,photo_draft_id,document_status,sheet_sync_status,created_at "+
  "FROM student_applications WHERE id=? AND staff_id=?"
 ).bind(recordId,staff.id).first<Stored>();
}
async function processSaved(env:WorkflowEnv,staff:StaffIdentity,row:Stored){
 const fields=JSON.parse(row.fields_json) as Record<string,string>;
 let photoFileId=row.photo_drive_id||"",pdfFileId=row.pdf_drive_id||"";
 if(!pdfFileId){
  const draft=await env.DB.prepare(
   "SELECT id,drive_file_id,mime,status,expires_at FROM staff_photo_drafts WHERE id=? AND staff_id=? AND kind=?"
  ).bind(row.photo_draft_id,staff.id,row.kind).first<{
   id:string;drive_file_id:string|null;mime:string;status:string;expires_at:string;
  }>();
  if(!draft||!draft.drive_file_id||draft.status!=="ready")
   throw Error("Photo draft unavailable. Contact Admin to recover the existing application.");
  const logo=row.kind==="admission"?
   await env.DB.prepare("SELECT extra_logo_drive_id,extra_logo_active FROM staff_courses WHERE course_id=?")
    .bind(fields.course).first<{extra_logo_drive_id:string|null;extra_logo_active:number}>():null;
  const terms=await env.DB.prepare(
   "SELECT setting_value FROM portal_settings WHERE setting_key=?"
  ).bind(row.kind==="admission"?"admissionTerms":"scholarshipTerms")
   .first<{setting_value:string}>();
  const doc=await driveRequest(env,{
   action:"finalizeStudentDocuments",type:row.kind,recordId:row.id,formNumber:row.form_number,
   createdAt:row.created_at,photoId:row.photo_draft_id,photoFileId:draft.drive_file_id,
   photoMime:draft.mime,fields,staffId:staff.id,staffName:staff.name,
   terms:terms?.setting_value||"",
   courseLogoFileId:logo?.extra_logo_active===1?logo.extra_logo_drive_id:null
  });
  photoFileId=String(doc.photoFileId||"");
  pdfFileId=String(doc.pdfFileId||"");
  if(!photoFileId||!pdfFileId)throw Error("PDF storage returned an incomplete reference");
  await env.DB.prepare(
   "UPDATE student_applications SET photo_drive_id=?,pdf_drive_id=?,document_status='ready',"+
   "document_last_error=NULL WHERE id=? AND staff_id=?"
  ).bind(photoFileId,pdfFileId,row.id,staff.id).run();
  // This ID now belongs to permanent application; do not let expiry cleanup trash it.
  await env.DB.prepare("DELETE FROM staff_photo_drafts WHERE id=? AND staff_id=?")
   .bind(row.photo_draft_id,staff.id).run();
 }
 if(row.sheet_sync_status!=="synced"){
  try{
   const sheet=await driveRequest(env,{
    action:"upsert",recordId:row.id,type:row.kind,formNumber:row.form_number,
    createdAt:row.created_at,studentName:row.student_name,mobile:row.mobile,
    staffId:staff.id,staffName:staff.name,fields:{...fields,termsAccepted:"Yes"},
    photoFileId,pdfFileId
   });
   if(sheet.success!==true)throw Error("Spreadsheet did not confirm entry");
   await env.DB.prepare("UPDATE student_applications SET sheet_sync_status='synced',sheet_last_error=NULL WHERE id=?")
    .bind(row.id).run();
  }catch(e){
   await env.DB.prepare(
    "UPDATE student_applications SET sheet_sync_status='failed',sheet_last_error=? WHERE id=?"
   ).bind(String(e).slice(0,200),row.id).run();
  }
 }
 return ownedApplication(env,staff,row.id);
}
function receipt(row:Stored){
 return {success:true,recordId:row.id,kind:row.kind,number:row.form_number,
   studentName:row.student_name,mobile:row.mobile,
   pdfReady:row.document_status==="ready"&&!!row.pdf_drive_id,
   pdfUrl:row.document_status==="ready"&&row.pdf_drive_id?"/api/staff/pdf/"+row.id:null,
   sheetStatus:row.sheet_sync_status,documentStatus:row.document_status};
}
export async function handleStaffApplication(request:Request,env:WorkflowEnv,staff:StaffIdentity):Promise<Response>{
 const path=new URL(request.url).pathname,post=request.method==="POST";
 if(!driveReady(env))return bad("Google Drive integration is not ready",503);
 if(env.STAFF_SUBMISSIONS_ENABLED!=="true")return bad("Final submission is not enabled until all tests are completed.",503);
 if(post&&(request.headers.get("Content-Type")||"").split(";")[0]!=="application/json")
  return bad("Expected JSON request");
 if(post&&Number(request.headers.get("Content-Length")||0)>20000)return bad("Form too large",413);
 if(post){
  let body:Record<string,unknown>;
  try{const raw=await request.text();if(raw.length>20000)throw Error("Too large");body=JSON.parse(raw);}
  catch{return bad("Invalid form submission",400);}
  if(path==="/api/staff/application/retry"){
   if(!isString(body.recordId)||!idRE.test(body.recordId))return bad("Invalid record reference");
   const row=await ownedApplication(env,staff,body.recordId);
   if(!row)return bad("Application not found",404);
   try{
    const latest=await processSaved(env,staff,row);
    return latest?json(receipt(latest)):bad("Application not found",404);
   }catch(e){return bad("The application is saved but Drive/PDF processing needs retry. Contact Admin if it continues.",503);}
  }
  if(path!=="/api/staff/application/submit")return bad("Unknown action",404);
  const kind=body.kind,photoId=body.photoId;
  if(kind!=="admission"&&kind!=="scholarship")return bad("Invalid form type");
  if(!isString(photoId)||!idRE.test(photoId))return bad("Upload the student photo first.");
  if(body.termsAccepted!==true)return bad("Student or guardian consent and terms acceptance required.");
  const prior=await env.DB.prepare("SELECT id FROM student_applications WHERE photo_draft_id=?")
   .bind(photoId).first<{id:string}>();
  if(prior){
   const existing=await ownedApplication(env,staff,prior.id);
   if(!existing)return bad("Photo already used in another form",409);
   try{
    return json(receipt(await processSaved(env,staff,existing) as Stored));
   }catch{return json({...receipt(existing),notice:"Saved. PDF or Sheets processing needs retry."},202);}
  }
  const draft=await env.DB.prepare(
   "SELECT status,expires_at FROM staff_photo_drafts WHERE id=? AND staff_id=? AND kind=?"
  ).bind(photoId,staff.id,kind).first<{status:string;expires_at:string}>();
  if(!draft||draft.status!=="ready"||draft.expires_at<=new Date().toISOString())
   return bad("Photo draft is missing or expired. Please upload again.");
  let fields:Record<string,string>;
  try{fields=await normalizedFields(env,kind,body.fields);}
  catch(e){return bad(e instanceof Error?e.message:"Invalid form fields");}
  const recordId=crypto.randomUUID();
  let number="";
  if(kind==="scholarship"){
   const seq=await env.DB.prepare(
    "UPDATE registration_sequences SET next_number=next_number+1 "+
    "WHERE sequence_key='scholarship' AND next_number<=end_number "+
    "RETURNING prefix,next_number-1 AS issued"
   ).first<{prefix:string;issued:number}>();
   if(!seq)return bad("Scholarship number range is not configured. Please contact Admin.",503);
   number=seq.prefix+seq.issued;
  }else{
   number="NA-ADM-"+new Date().getUTCFullYear()+"-"+recordId.slice(0,8).toUpperCase();
  }
  const cents=kind==="scholarship"?10000:Math.round(Number(fields.totalFees)*100);
  try{
   await env.DB.prepare(
    "INSERT INTO student_applications"+
    "(id,kind,form_number,staff_id,student_name,mobile,course_id,fields_json,"+
    "payment_mode,fee_amount,sheet_sync_status,photo_draft_id,document_status) "+
    "VALUES (?,?,?,?,?,?,?,?,?,?,'pending',?,'pending')"
   ).bind(recordId,kind,number,staff.id,fields.studentName,fields.mobile,
    kind==="admission"?fields.course:"ecce",
    JSON.stringify(fields),kind==="scholarship"?fields.paymentMode:null,cents,photoId).run();
  }catch(e){
   const dupe=await env.DB.prepare("SELECT id FROM student_applications WHERE photo_draft_id=?")
    .bind(photoId).first<{id:string}>();
   if(dupe){
    const row=await ownedApplication(env,staff,dupe.id);
    if(row)return json({...receipt(row),notice:"An application with this photo was already saved."},202);
   }
   console.error("Staff application insert failed",{kind});
   return bad("Could not reserve application record. Contact Admin.",503);
  }
  const row=await ownedApplication(env,staff,recordId);
  if(!row)return bad("Application was reserved but could not be read. Contact Admin.",503);
  try{
   const updated=await processSaved(env,staff,row);
   return updated?json(receipt(updated),201):bad("Could not read saved form",503);
  }catch(e){
   console.error("Saved application pending PDF/Google Drive",String(e).slice(0,130));
   await env.DB.prepare(
    "UPDATE student_applications SET document_status='pending',document_last_error=? WHERE id=?"
   ).bind(String(e).slice(0,250),row.id).run().catch(()=>{});
   return json({...receipt(row),notice:"Application number saved. PDF/Drive processing is pending. Use Retry Processing."},202);
  }
 }
 if(request.method==="GET"&&path==="/api/staff/applications"){
  const rows=await env.DB.prepare(
   "SELECT id,kind,form_number,student_name,mobile,pdf_drive_id,document_status,"+
   "sheet_sync_status,created_at FROM student_applications WHERE staff_id=? "+
   "ORDER BY created_at DESC LIMIT 60"
  ).bind(staff.id).all<Record<string,unknown>>();
  return json({applications:rows.results});
 }
 if(request.method==="GET"&&path.startsWith("/api/staff/pdf/")){
  const id=path.slice("/api/staff/pdf/".length);
  if(!idRE.test(id))return bad("Invalid PDF reference",400);
  const row=await ownedApplication(env,staff,id);
  if(!row)return bad("PDF not found",404);
  if(row.document_status!=="ready"||!row.pdf_drive_id)return bad("PDF is not ready",404);
  try{
   const response=await driveRequest(env,{action:"getPdf",type:row.kind,fileId:row.pdf_drive_id});
   const bytes=fromBase64(String(response.base64||""));
   if(bytes.byteLength<500||bytes.byteLength>8000000)throw Error("Invalid PDF size");
   return new Response(bytes,{headers:{
    "Content-Type":"application/pdf",
    "Content-Disposition":'attachment; filename="Nitya-Academy-'+row.form_number.replace(/[^A-Za-z0-9_-]/g,"")+'.pdf"',
    "Cache-Control":"private,no-store","X-Content-Type-Options":"nosniff"
   }});
  }catch(e){console.error("PDF download unavailable",String(e).slice(0,120));
   return bad("PDF download failed. Retry from the Staff dashboard.",503);}
 }
 return bad("Unsupported application operation",405);
}
