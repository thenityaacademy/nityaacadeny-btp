/**
 * Nitya Academy Staff Portal — two DIFFERENT existing header layouts.
 * Keep existing Row 1 headings. No replacement/clearing of sheet headers.
 * Script Properties: STAFF_SPREADSHEET_ID and STAFF_SHEETS_SECRET.
 */
const HEADER_KEYS = {
  "application no":"formNumber","application number":"formNumber",
  "registration no":"formNumber","registration number":"formNumber",
  "submission date":"createdAt","submitted at":"createdAt",
  "registration date":"registrationDate",
  "student name":"studentName","father name":"fatherName","mother name":"motherName",
  "date of birth":"dob","dob":"dob","gender":"gender",
  "mobile number":"mobile","mobile":"mobile","whatsapp number":"whatsapp",
  "email":"email","aadhaar number":"aadhaar","aadhar number":"aadhaar",
  "full address":"address","address":"address","city/village":"city",
  "district":"district","state":"state","pin code":"pin",
  "10th board":"board10","10th passing year":"year10","10th percentage":"percent10",
  "12th board":"board12","12th passing year":"year12","12th percentage":"percent12",
  "12th pass":"passed12","last qualification":"lastQualification",
  "university/board":"lastBoard","qualification passing year":"lastYear",
  "qualification percentage":"lastPercent",
  "course":"course","session":"session","course type":"courseType",
  "total fees":"totalFees","practical fees applicable":"practicalApplicable",
  "practical fees amount":"practicalFee","reference applicable":"hasReference",
  "reference name":"referenceName","staff id":"staffId","staff name":"staffName",
  "photo link":"photoUrl","pdf link":"pdfUrl","terms accepted":"termsAccepted",
  "submission status":"submissionStatus","exam date":"examDate",
  "registration fee":"registrationFee","payment mode":"paymentMode",
  "transaction reference no":"transactionRef","transaction reference number":"transactionRef",
  "record id":"recordId"
};
function normalize_(s){return String(s||"").trim().toLowerCase().replace(/\s+/g," ");}
function doPost(e){
 let locked=false;
 const lock=LockService.getScriptLock();
 try {
  const payload=JSON.parse(e.postData.contents);
  const props=PropertiesService.getScriptProperties();
  const secret=props.getProperty("STAFF_SHEETS_SECRET");
  if(!secret||payload.secret!==secret)throw new Error("Unauthorized");
  if(payload.action!=="upsert"||!["admission","scholarship"].includes(payload.type)||
     !payload.recordId||!payload.formNumber)throw new Error("Invalid payload");
  const spreadsheetId=props.getProperty("STAFF_SPREADSHEET_ID");
  if(!spreadsheetId)throw new Error("Spreadsheet ID not configured");
  const sheet=SpreadsheetApp.openById(spreadsheetId).getSheetByName(
   payload.type==="admission"?"Admissions":"Scholarships"
  );
  if(!sheet)throw new Error("Required tab not found");
  locked=lock.tryLock(20000);
  if(!locked)throw new Error("Sheet busy, retry later");
  const width=sheet.getLastColumn();
  if(width<1)throw new Error("Row 1 headings missing");
  const headings=sheet.getRange(1,1,1,width).getDisplayValues()[0];
  const keyColumn=payload.type==="admission"?"application no":"registration no";
  const keyIndex=headings.findIndex(h=>normalize_(h)===keyColumn);
  if(keyIndex<0)throw new Error("Missing "+keyColumn+" header");
  const details=payload.fields||{};
  const info=Object.assign({},details,{
    recordId:payload.recordId,formNumber:payload.formNumber,
    createdAt:payload.createdAt,studentName:payload.studentName,mobile:payload.mobile,
    staffId:payload.staffId,staffName:payload.staffName,
    registrationFee:payload.type==="scholarship"?100:"",
    submissionStatus:"Submitted",
  });
  // Preserve all existing columns and their individual sheet ordering.
  const data=headings.map(h=>{
   const field=HEADER_KEYS[normalize_(h)];
   const value=field?String(info[field]??""):"";
   return /^[=+@\-\t\r]/.test(value)?"'"+value:value;
  });
  // Key by stable, server-generated form number so retries cannot duplicate rows.
  const last=sheet.getLastRow();
  const previous=last>1?sheet.getRange(2,keyIndex+1,last-1,1)
     .createTextFinder(String(payload.formNumber)).matchEntireCell(true).findNext():null;
  const target=previous?previous.getRow():last+1;
  sheet.getRange(target,1,1,width).setNumberFormat("@").setValues([data]);
  return ContentService.createTextOutput(JSON.stringify({success:true,row:target}))
   .setMimeType(ContentService.MimeType.JSON);
 }catch(err){
  return ContentService.createTextOutput(JSON.stringify({success:false,error:String(err.message||err)}))
   .setMimeType(ContentService.MimeType.JSON);
 }finally{if(locked)lock.releaseLock();}
}
