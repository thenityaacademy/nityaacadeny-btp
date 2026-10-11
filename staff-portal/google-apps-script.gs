/**
 * Nitya Academy Staff Portal Google Sheets bridge.
 * Deploy as web app accessible to Worker; use a strong secret in Script Properties
 * (STAFF_SHEETS_SECRET), and the same value in Cloudflare Worker secret.
 * Spreadsheet ID goes in Script Properties (STAFF_SPREADSHEET_ID).
 * Never make the spreadsheet itself public.
 */
const COLUMNS = [
 "Record ID","Form Number","Submitted At","Student Name","Father Name","Mother Name",
 "Date of Birth","Gender","Mobile Number","WhatsApp Number","Email","Aadhaar Number",
 "Full Address","District","State","PIN Code","12th Board","12th Passing Year",
 "12th Percentage","Last Qualification","Course","Session","Total Fees",
 "Practical Fees Applicable","Practical Fees Amount","Reference Applicable",
 "Reference Name","Registration Date","Exam Date","12th Pass",
 "Registration Fee","Payment Mode","Transaction Reference No","Staff ID","Staff Name"
];
const KEYS=[
 "recordId","formNumber","createdAt","studentName","fatherName","motherName",
 "dob","gender","mobile","whatsapp","email","aadhaar","address","district","state",
 "pin","board12","year12","percent12","lastQualification","course","session",
 "totalFees","practicalApplicable","practicalFee","hasReference","referenceName",
 "registrationDate","examDate","passed12","registrationFee","paymentMode",
 "transactionRef","staffId","staffName"
];
function doPost(e){
 const lock=LockService.getScriptLock();let acquired=false;
 try{
  const data=JSON.parse(e.postData.contents);
  const props=PropertiesService.getScriptProperties();
  const configuredSecret=props.getProperty("STAFF_SHEETS_SECRET");
  if(!configuredSecret || data.secret!==configuredSecret)throw new Error("Unauthorized");
  if(data.action!=="upsert"||!["admission","scholarship"].includes(data.type)||!data.recordId)throw new Error("Invalid payload");
  const ss=SpreadsheetApp.openById(props.getProperty("STAFF_SPREADSHEET_ID"));
  const tab=data.type==="admission"?"Admissions":"Scholarships";
  const sheet=ss.getSheetByName(tab);
  if(!sheet)throw new Error("Missing tab: "+tab);
  acquired=lock.tryLock(20000);
  if(!acquired)throw new Error("Sheet busy");
  if(sheet.getLastRow()===0)sheet.appendRow(COLUMNS);
  if(sheet.getRange(1,1,1,COLUMNS.length).getValues()[0][0]!=="Record ID")throw new Error("Unexpected header layout in "+tab);
  const last=sheet.getLastRow();
  const matches=last>1?sheet.getRange(2,1,last-1,1).createTextFinder(String(data.recordId)).matchEntireCell(true).findNext():null;
  const f=data.fields||{};
  const flat={...f,recordId:String(data.recordId),formNumber:data.formNumber,createdAt:data.createdAt,studentName:data.studentName,mobile:data.mobile,staffId:data.staffId,staffName:data.staffName,registrationFee:data.type==="scholarship"?"100":""};
  // Text-formatted cells prevent leading zero loss and formula injection.
  const row=KEYS.map(k=>{const v=String(flat[k]??"");return /^[=+@\-\t\r]/.test(v)?"'"+v:v;});
  const target=matches?matches.getRow():last+1;
  sheet.getRange(target,1,1,row.length).setNumberFormat("@").setValues([row]);
  return ContentService.createTextOutput(JSON.stringify({success:true,row:target})).setMimeType(ContentService.MimeType.JSON);
 }catch(err){return ContentService.createTextOutput(JSON.stringify({success:false,error:String(err.message||err)})).setMimeType(ContentService.MimeType.JSON);}
 finally{if(acquired)lock.releaseLock();}
}
