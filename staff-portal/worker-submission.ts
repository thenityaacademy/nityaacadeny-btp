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
  sheet_sync_status:string;created_at:string;staff_hidden_at:string|null;revision_number:number;revised_at:string|null};
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
  "photo_drive_id,pdf_drive_id,photo_draft_id,document_status,sheet_sync_status,created_at,staff_hidden_at,revision_number,revised_at "+
  "FROM student_applications WHERE id=? AND staff_id=?"
 ).bind(recordId,staff.id).first<Stored>();
}
async function processSaved(env:WorkflowEnv,staff:StaffIdentity,row:Stored){
 const fields=JSON.parse(row.fields_json) as Record<string,string>;
 let photoFileId=row.photo_drive_id||"",pdfFileId=row.pdf_drive_id||"";
 if(!pdfFileId||row.document_status!=="ready"){
  const draft=await env.DB.prepare(
   "SELECT id,drive_file_id,mime,status,expires_at FROM staff_photo_drafts WHERE id=? AND staff_id=? AND kind=?"
  ).bind(row.photo_draft_id,staff.id,row.kind).first<{
   id:string;drive_file_id:string|null;mime:string;status:string;expires_at:string;
  }>();
  if((!draft||!draft.drive_file_id||draft.status!=="ready")&&!photoFileId)
   throw Error("Photo draft unavailable. Contact Admin to recover the existing application.");
  const logo=row.kind==="admission"?
   await env.DB.prepare("SELECT extra_logo_drive_id,extra_logo_active FROM staff_courses WHERE course_id=?")
    .bind(fields.course).first<{extra_logo_drive_id:string|null;extra_logo_active:number}>():null;
  const terms=await env.DB.prepare(
   "SELECT setting_value FROM portal_settings WHERE setting_key=?"
  ).bind(row.kind==="admission"?"admissionTerms":"scholarshipTerms")
   .first<{setting_value:string}>();
  const regenerating=!!pdfFileId&&row.document_status!=="ready";
  const doc=await driveRequest(env,{
   action:regenerating?"reviseStudentDocuments":"finalizeStudentDocuments",type:row.kind,recordId:row.id,formNumber:row.form_number,
   createdAt:row.created_at,photoId:row.photo_draft_id,photoFileId:photoFileId||draft?.drive_file_id,
   existingPdfFileId:regenerating?pdfFileId:null,revisionNumber:row.revision_number,
   photoMime:draft?.mime||null,fields:{...fields,course:fields.courseName||fields.course},staffId:staff.id,staffName:staff.name,
   terms:terms?.setting_value||"",
   courseLogoFileId:logo?.extra_logo_active===1?logo.extra_logo_drive_id:null
  });
  photoFileId=String(doc.photoFileId||"");
  pdfFileId=String(doc.pdfFileId||"");
  if(!photoFileId||!pdfFileId)throw Error("PDF storage returned an incomplete reference");
  const savedPdf=await env.DB.prepare(
   "UPDATE student_applications SET photo_drive_id=?,pdf_drive_id=?,document_status='ready',"+
   "document_last_error=NULL WHERE id=? AND staff_id=? AND revision_number=?"
  ).bind(photoFileId,pdfFileId,row.id,staff.id,row.revision_number).run();
  if(savedPdf.meta?.changes!==1)throw Error("Form revision changed during PDF generation. Refresh and retry.");
  // This ID now belongs to permanent application; do not let expiry cleanup trash it.
  if(draft)await env.DB.prepare("DELETE FROM staff_photo_drafts WHERE id=? AND staff_id=?")
   .bind(row.photo_draft_id,staff.id).run();
 }
 if(row.sheet_sync_status!=="synced"){
  try{
   const sheet=await driveRequest(env,{
    action:"upsert",recordId:row.id,type:row.kind,formNumber:row.form_number,
    createdAt:row.created_at,studentName:fields.studentName||row.student_name,mobile:fields.mobile||row.mobile,
    staffId:staff.id,staffName:staff.name,fields:{...fields,course:fields.courseName||fields.course,termsAccepted:"Yes"},
    photoFileId,pdfFileId
   });
   if(sheet.success!==true)throw Error("Spreadsheet did not confirm entry");
   await env.DB.prepare("UPDATE student_applications SET sheet_sync_status='synced',sheet_last_error=NULL WHERE id=?")
    .bind(row.id).run();
  }catch(e){
   await env.DB.prepare(
    "UPDATE student_applications SET sheet_sync_status='failed',sheet_last_error=? WHERE id=?"
   ).bind(/illegal spreadsheet id or key/i.test(String(e))
     ?"Spreadsheet ID configured in Google Apps Script Properties is invalid."
     :/required tab missing|sheet headings missing|header not found/i.test(String(e))
       ?"Google Sheet tabs/headings are misconfigured."
       :"Google Sheets integration failed; check Apps Script Executions.",row.id).run();
  }
 }
 return ownedApplication(env,staff,row.id);
}
function receipt(row:Stored){
 return {success:true,recordId:row.id,kind:row.kind,number:row.form_number,
   studentName:row.student_name,mobile:row.mobile,
   pdfReady:row.document_status==="ready"&&!!row.pdf_drive_id,
   pdfUrl:row.document_status==="ready"&&row.pdf_drive_id?"/api/staff/pdf/"+row.id:null,
   sheetStatus:row.sheet_sync_status,documentStatus:row.document_status,
   revisionNumber:row.revision_number};
}
async function serveStaffPdf(env:WorkflowEnv,staff:StaffIdentity,id:string):Promise<Response>{
  if(!idRE.test(id))return bad("Invalid PDF reference",400);
  const row=await ownedApplication(env,staff,id);
  if(!row||row.staff_hidden_at)return bad("PDF not found in active Staff forms",404);
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
  if(path==="/api/staff/application/details"){
   if(!isString(body.recordId)||!idRE.test(body.recordId))return bad("Invalid form reference",400);
   const row=await ownedApplication(env,staff,body.recordId);
   if(!row)return bad("Form not found",404);
   return json({recordId:row.id,number:row.form_number,kind:row.kind,
     fields:JSON.parse(row.fields_json),revisionNumber:row.revision_number,
     hidden:!!row.staff_hidden_at,documentStatus:row.document_status,
     sheetStatus:row.sheet_sync_status});
  }
  if(path==="/api/staff/application/hide"||path==="/api/staff/application/restore"){
   if(!isString(body.recordId)||!idRE.test(body.recordId))return bad("Invalid form reference",400);
   const row=await ownedApplication(env,staff,body.recordId);
   if(!row)return bad("Form not found",404);
   const hide=path.endsWith("/hide");
   if(hide===!!row.staff_hidden_at)return json({success:true,number:row.form_number,hidden:hide});
   const change=await env.DB.prepare(hide?
     "UPDATE student_applications SET staff_hidden_at=CURRENT_TIMESTAMP WHERE id=? AND staff_id=? AND staff_hidden_at IS NULL":
     "UPDATE student_applications SET staff_hidden_at=NULL WHERE id=? AND staff_id=? AND staff_hidden_at IS NOT NULL"
   ).bind(row.id,staff.id).run();
   if(change.meta?.changes!==1)return bad("Form was changed. Refresh and retry.",409);
   await env.DB.prepare(
     "INSERT INTO staff_form_audit(application_id,staff_id,action,revision_number) VALUES (?,?,?,?)"
   ).bind(row.id,staff.id,hide?"hide":"restore",row.revision_number).run();
   return json({success:true,number:row.form_number,hidden:hide,
     message:hide?"Form removed from active Staff list; issued number and Drive/Sheet records are preserved.":"Form restored to active Staff list."});
  }
  if(path==="/api/staff/application/regenerate-pdf"){
   if(!isString(body.recordId)||!idRE.test(body.recordId))
     return bad("Invalid form reference",400);
   const row=await ownedApplication(env,staff,body.recordId);
   if(!row)return bad("Form not found",404);
   if(row.staff_hidden_at)return bad("Restore the form first.",409);
   if(!row.photo_drive_id||!row.pdf_drive_id||row.document_status!=="ready")
     return bad("Form PDF is not ready. Retry PDF / Google Sheet processing first.",409);
   // Do not replace a working private PDF until owner has deployed the
   // fixed 1.0 / 1.1 line spacing. V5 generated 41–46 page PDFs.
   try{
     const bridge=await driveRequest(env,{action:"staffPdfV5Ready"});
     if(bridge.code!=="STAFF_PDF_V5_1_READY")
       return bad("The compact PDF V5.1 is not deployed. Admin must update Google Apps Script first.",503);
   }catch{
     return bad("Could not verify compact PDF V5.1. No data was changed.",503);
   }
   const update=await env.DB.prepare(
     "UPDATE student_applications SET document_status='pending',document_last_error=NULL "+
     "WHERE id=? AND staff_id=? AND staff_hidden_at IS NULL AND document_status='ready' AND revision_number=?"
   ).bind(row.id,staff.id,row.revision_number).run();
   if(update.meta?.changes!==1)return bad("Form changed during PDF regeneration. Refresh and retry.",409);
   const pending={...row,document_status:"pending" as DocState};
   try{
     const saved=await processSaved(env,staff,pending);
     if(!saved)return bad("Form could not be reloaded.",503);
     return json({...receipt(saved),
       notice:saved.document_status==="ready"
         ?"Compact PDF regenerated with the ORIGINAL Registration Number. Google Sheet was not renumbered."
         :"Regeneration pending; use Retry PDF / Sheet Processing."});
   }catch(err){
     console.error("Staff compact PDF regeneration pending",String(err).slice(0,130));
     return json({...receipt(pending),notice:"Regeneration is pending; original form number is preserved. Use Retry PDF / Sheet Processing."},202);
   }
  }
  if(path==="/api/staff/application/update"){
   if(!isString(body.recordId)||!idRE.test(body.recordId)||
      typeof body.revisionNumber!=="number"||!Number.isSafeInteger(body.revisionNumber))
      return bad("Invalid form or revision reference",400);
   const row=await ownedApplication(env,staff,body.recordId);
   if(!row)return bad("Form not found",404);
   if(row.staff_hidden_at)return bad("Restore the removed form before editing.",409);
   if(row.revision_number!==body.revisionNumber)return bad("Form was updated in another tab. Refresh before editing.",409);
   if(!body.changes||typeof body.changes!=="object"||Array.isArray(body.changes))
     return bad("Invalid changed fields",400);
   const changes=body.changes as Record<string,unknown>;
   if(Object.keys(changes).length>45)return bad("Too many edited fields",400);
   // Fail closed BEFORE any D1 edit if the newer private PDF bridge is not
   // deployed. Old V4 apps script would keep stale PDF data after a correction.
   try{
     const bridge=await driveRequest(env,{action:"staffPdfV5Ready"});
     if(bridge.code!=="STAFF_PDF_V5_1_READY")return bad("Compact PDF V5.1 must be deployed before editing saved forms.",503);
   }catch{
     return bad("New professional PDF template is not yet activated. Admin must deploy Apps Script V5 before editing forms.",503);
   }
   const oldFields=JSON.parse(row.fields_json) as Record<string,string>;
   const sanitized:Record<string,string>={...oldFields};
   for(const key of ["courseName","registrationDate","registrationFee","termsAccepted"])delete sanitized[key];
   for(const [key,value] of Object.entries(changes)){
     if(["courseName","registrationDate","registrationFee","termsAccepted","formNumber","staffId","photoId","recordId"].includes(key)
       ||typeof value!=="string"||value.length>1000)return bad("Invalid edited field "+key,400);
     sanitized[key]=value;
   }
   let fields:Record<string,string>;
   try{fields=await normalizedFields(env,row.kind,sanitized);}
   catch(e){return bad(e instanceof Error?e.message:"Invalid correction data",400);}
   // Retain original registration date and payment-record provenance.
   if(row.kind==="scholarship"){
     fields.registrationDate=oldFields.registrationDate||fields.registrationDate;
     fields.registrationFee="100";
   }
   if(JSON.stringify(fields)===JSON.stringify(oldFields))
     return json({...receipt(row),notice:"No changes to save."});
   const updated=await env.DB.prepare(
     "UPDATE student_applications SET fields_json=?,student_name=?,mobile=?,course_id=?,"+
     "payment_mode=?,fee_amount=?,revision_number=revision_number+1,revised_at=CURRENT_TIMESTAMP,"+
     "document_status='pending',sheet_sync_status='pending',sheet_last_error=NULL,document_last_error=NULL "+
     "WHERE id=? AND staff_id=? AND revision_number=? AND staff_hidden_at IS NULL"
   ).bind(JSON.stringify(fields),fields.studentName,fields.mobile,
      row.kind==="admission"?fields.course:"ecce",
      row.kind==="scholarship"?fields.paymentMode:null,
      row.kind==="scholarship"?10000:Math.round(Number(fields.totalFees)*100),
      row.id,staff.id,row.revision_number).run();
   if(updated.meta?.changes!==1)return bad("Form was changed; refresh before saving.",409);
   await env.DB.prepare(
     "INSERT INTO staff_form_audit(application_id,staff_id,action,revision_number) VALUES (?,?,?,?)"
   ).bind(row.id,staff.id,"edit",row.revision_number+1).run();
   const fresh=await ownedApplication(env,staff,row.id);
   if(!fresh)return bad("Correction saved; please reopen the submitted form.",503);
   try{
     const processed=await processSaved(env,staff,fresh);
     return json({...receipt(processed||fresh),notice:processed?.document_status==="ready"?
       "Correction saved. Updated PDF and Google Sheet processed. Original form number retained.":
       "Correction saved; PDF regeneration and Sheet update need retry."});
   }catch(e){
     console.error("Edited Staff form pending PDF regeneration",String(e).slice(0,140));
     await env.DB.prepare(
       "UPDATE student_applications SET document_last_error=? WHERE id=? AND staff_id=?"
     ).bind("Updated document processing pending. Check Apps Script V5 deployment.",row.id,staff.id).run().catch(()=>{});
     return json({...receipt(fresh),
       notice:"Correction saved with the same number. Updated PDF/Sheet is pending; use Retry Processing after Apps Script V5 is deployed."},202);
   }
  }
  if(path==="/api/staff/application/pdf-download"){
   // PDF is delivered only to the owner of the recorded form.
   // POST requests reach the Worker despite SPA asset navigation rules.
   if(!isString(body.recordId)||!idRE.test(body.recordId))
    return bad("Invalid PDF reference",400);
   return serveStaffPdf(env,staff,body.recordId);
  }
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
  // Reserve the Application/Scholarship number AND student record in one
  // atomic D1 batch. No serial can be duplicated or consumed by a failed insert.
  // The unique photo_draft_id also prevents accidental double submissions.
  const cents=kind==="scholarship"?10000:Math.round(Number(fields.totalFees)*100);
  try{
    const results=await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO student_applications"+
        "(id,kind,form_number,staff_id,student_name,mobile,course_id,fields_json,"+
        "payment_mode,fee_amount,sheet_sync_status,photo_draft_id,document_status) "+
        "SELECT ?,?,CASE WHEN ?='admission' THEN prefix||printf('%04d',next_number) "+
        "ELSE prefix||CAST(next_number AS TEXT) END,?,?,?,?,?,? ,?,'pending',?,'pending' "+
        "FROM registration_sequences WHERE sequence_key=? AND next_number<=end_number"
      ).bind(recordId,kind,kind,staff.id,fields.studentName,fields.mobile,
        kind==="admission"?fields.course:"ecce",JSON.stringify(fields),
        kind==="scholarship"?fields.paymentMode:null,cents,photoId,kind),
      env.DB.prepare(
        "UPDATE registration_sequences SET next_number=next_number+1 "+
        "WHERE sequence_key=? AND next_number<=end_number"
      ).bind(kind)
    ]);
    // If sequence is not configured or exhausted, both statements affect zero
    // rows. In that case no student record is created and nothing is charged.
    if((results[0].meta?.changes||0)!==1||(results[1].meta?.changes||0)!==1)
      return bad(kind==="admission"?
        "Admission application number range is exhausted or not configured. Contact Admin.":
        "Scholarship registration number range is exhausted or not configured. Contact Admin.",503);
  }catch(e){
    const dupe=await env.DB.prepare(
      "SELECT id FROM student_applications WHERE photo_draft_id=?"
    ).bind(photoId).first<{id:string}>();
    if(dupe){
      const existing=await ownedApplication(env,staff,dupe.id);
      if(existing)return json({...receipt(existing),notice:"This uploaded photo already belongs to a recorded application."},202);
    }
    console.error("Unable to reserve Staff application",String(e).slice(0,160));
    return bad("Could not reserve a unique form number. Please refresh and contact Admin if this continues.",503);
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
  const hidden=new URL(request.url).searchParams.get("removed")==="1";
  const rows=await env.DB.prepare(
   "SELECT id,kind,form_number,student_name,mobile,pdf_drive_id,document_status,"+
   "sheet_sync_status,created_at,revision_number,revised_at,staff_hidden_at FROM student_applications "+
   "WHERE staff_id=? AND "+(hidden?"staff_hidden_at IS NOT NULL":"staff_hidden_at IS NULL")+" "+
   "ORDER BY created_at DESC LIMIT 60"
  ).bind(staff.id).all<Record<string,unknown>>();
  return json({applications:rows.results,removed:hidden});
 }
 if(request.method==="GET"&&path.startsWith("/api/staff/pdf/")){
  return serveStaffPdf(env,staff,path.slice("/api/staff/pdf/".length));
 }
 return bad("Unsupported application operation",405);
}
