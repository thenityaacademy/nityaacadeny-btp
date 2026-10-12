/**
 * Nitya Academy Staff Portal — Google Sheets + PRIVATE Google Drive bridge.
 * Deploy as Google Apps Script Web App (execute as account owner).
 * Script Properties: STAFF_SPREADSHEET_ID, STAFF_SHEETS_SECRET.
 * Anyone with the Web App URL can call it, but each POST requires the
 * unguessable shared secret in the JSON body. Never put secret in a URL.
 * Do not make student photos, Aadhaar PDFs, or folders public.
 */
const DRIVE_FOLDERS={
  admissions:{photos:"16cYt2PkbLlGUgOVtTr_WgUWggGN_XWmn",pdfs:"14camlCdZmGh2OZPxm1h8fA6aGM_xtzZ_"},
  scholarships:{photos:"1LBtTOfVaeGtGBRJhV4nOA6sm6gRGAyRP",pdfs:"1fxGuq6J9KadsGCPoTEij8aEhGgnWIE9r"},
  logos:"1tHlgQjQ7WvWsRQsSj3FZImsVxxXAzVay",
  mainLogo:"1eH75kZyla2u4JOZ-Th3QlMvbidK0KbNW"
};
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
  "10th pass":"passed10","12th pass":"passed12","last qualification":"lastQualification",
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

function response_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function shortId_(s){return typeof s==="string" && /^[a-zA-Z0-9_-]{8,150}$/.test(s);}
function inFolder_(file,folderId){const parents=file.getParents();while(parents.hasNext())if(parents.next().getId()===folderId)return true;return false;}
function getFolder_(kind,part){const v=DRIVE_FOLDERS[kind];if(!v||!v[part])throw Error("Invalid destination");return DriveApp.getFolderById(v[part]);}
function findInFolder_(folder,name){const files=folder.getFilesByName(name);return files.hasNext()?files.next():null;}
function prepareBlob_(base64,mime,name,maxBytes){
 if(typeof base64!=="string"||base64.length>Math.ceil(maxBytes*4/3)+20)throw Error("File too large");
 if(!["image/jpeg","image/png","image/webp"].includes(mime))throw Error("Invalid image format");
 const bytes=Utilities.base64Decode(base64);
 if(!bytes.length||bytes.length>maxBytes)throw Error("Image exceeds allowed size");
 return Utilities.newBlob(bytes,mime,name);
}
function addImage_(body,blob,maxWidth){
 try{
  const image=body.appendImage(blob);
  const width=image.getWidth(),height=image.getHeight();
  if(width>maxWidth){image.setWidth(maxWidth);image.setHeight(Math.max(1,Math.round(height*maxWidth/width)));}
 }catch(err){throw Error("Could not embed image in PDF: "+String(err.message||err));}
}
function buildPdf_(p,photoFile,existingPdf) {
 if(existingPdf)return existingPdf;
 const values=p.fields||{};
 const folder=getFolder_(p.type,"pdfs");
 const fileName="Nitya Academy "+(p.type==="admission"?"Admission":"ECCE Scholarship")+" - "+p.formNumber+".pdf";
 const doc=DocumentApp.create("TEMP - "+p.formNumber+" - "+p.recordId);
 try{
  const b=doc.getBody();
  b.setMarginTop(32);b.setMarginBottom(32);b.setMarginLeft(36);b.setMarginRight(36);
  addImage_(b,DriveApp.getFileById(DRIVE_FOLDERS.mainLogo).getBlob(),90);
  if(p.courseLogoFileId){
   const courseLogo=DriveApp.getFileById(p.courseLogoFileId);
   if(!inFolder_(courseLogo,DRIVE_FOLDERS.logos))throw Error("Unrecognized course logo");
   addImage_(b,courseLogo.getBlob(),70);
  }
  b.appendParagraph("NITYA ACADEMY, BHARATPUR")
   .setHeading(DocumentApp.ParagraphHeading.HEADING1)
   .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  b.appendParagraph("Near Ketan Gate, Sahyog Nagar, Bharatpur 321001 | 9680008384 | 9802813444")
   .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  b.appendParagraph(p.type==="admission"?"STUDENT ADMISSION FORM":"ECCE SCHOLARSHIP REGISTRATION FORM")
   .setHeading(DocumentApp.ParagraphHeading.HEADING2).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  b.appendParagraph("Application / Registration No.: "+p.formNumber);
  b.appendParagraph("Submission Date: "+p.createdAt);
  addImage_(b,photoFile.getBlob(),105);
  const labels={
   studentName:"Student Name",fatherName:"Father Name",motherName:"Mother Name",dob:"Date of Birth",
   gender:"Gender",aadhaar:"Aadhaar Number",mobile:"Mobile",whatsapp:"WhatsApp",email:"Email",
   address:"Address",city:"City/Village",district:"District",state:"State",pin:"PIN Code",
   passed10:"10th Passed",board10:"10th Board",year10:"10th Passing Year",percent10:"10th %",
   passed12:"12th Passed",board12:"12th Board",year12:"12th Passing Year",percent12:"12th %",
   lastQualification:"Last Qualification",lastBoard:"Last Board/University",lastYear:"Last Passing Year",
   lastPercent:"Last Qualification %",course:"Course",session:"Session",
   totalFees:"Total Fees (INR)",practicalApplicable:"Practical Fees?",practicalFee:"Practical Fee (INR)",
   hasReference:"External Reference",referenceName:"Reference Name",registrationDate:"Registration Date",
   examDate:"Exam Date",paymentMode:"Payment Mode",transactionRef:"Transaction Reference"
  };
  const lines=[];
  Object.keys(labels).forEach(key=>{if(values[key]!==undefined&&String(values[key]).trim()!=="")
   lines.push([labels[key],String(values[key]).slice(0,500)]);});
  if(p.type==="scholarship")lines.push(["Registration Fee","INR 100"]);
  lines.push(["Staff Reference",String(p.staffName||"")+" ("+String(p.staffId||"")+")"]);
  const table=b.appendTable(lines);
  for(let i=0;i<lines.length;i++)table.getRow(i).getCell(0).setBackgroundColor("#e9f2ff");
  if(p.terms)b.appendParagraph("Terms & Conditions").setHeading(DocumentApp.ParagraphHeading.HEADING3);
  if(p.terms)b.appendParagraph(String(p.terms).slice(0,10000));
  b.appendParagraph("\nStudent / Guardian Signature: _____________________");
  b.appendParagraph("For Nitya Academy: _____________________");
  doc.saveAndClose();
  const temp=DriveApp.getFileById(doc.getId());
  const pdfBlob=temp.getAs(MimeType.PDF).setName(fileName);
  return folder.createFile(pdfBlob);
 }finally{
  try{DriveApp.getFileById(doc.getId()).setTrashed(true);}catch(ignore){}
 }
}
function saveDocuments_(p){
 if(!["admission","scholarship"].includes(p.type) || !/^[a-f0-9-]{36}$/i.test(String(p.recordId||""))
    || !/^[A-Za-z0-9_-]{4,80}$/.test(String(p.formNumber||"")))throw Error("Invalid document reference");
 const values=p.fields||{};
 if(!values.studentName||!values.aadhaar)throw Error("Student details are missing");
 if(!p.photoBase64||!p.photoMime)throw Error("Photo required");
 const photos=getFolder_(p.type,"photos"),pdfs=getFolder_(p.type,"pdfs");
 const photoName="Student Photo "+p.recordId;
 const pdfName="Nitya Academy "+(p.type==="admission"?"Admission":"ECCE Scholarship")+" - "+p.formNumber+".pdf";
 let photo=findInFolder_(photos,photoName);
 if(!photo)photo=photos.createFile(prepareBlob_(p.photoBase64,p.photoMime,photoName,2500000));
 let pdf=findInFolder_(pdfs,pdfName);
 pdf=buildPdf_(p,photo,pdf);
 return {success:true,photoFileId:photo.getId(),pdfFileId:pdf.getId()};
}
/**
 * STAFF PHOTO V3: standalone PRIVATE photo draft storage.
 * No student name, Aadhaar, phone number or public sharing.
 * Only UUID-labeled drafts go into existing private photo folders.
 * An unused draft must be removed after the Form is abandoned.
 */
function photoDraftName_(photoId){
 if(typeof photoId!=="string"||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(photoId))
   throw Error("Invalid photo reference");
 return "Nitya Student Photo Draft "+photoId.toLowerCase();
}
function photoDraftFolder_(type){
 if(type!=="admission"&&type!=="scholarship")throw Error("Invalid form type");
 return getFolder_(type==="admission"?"admissions":"scholarships","photos");
}
function photoDraftFile_(p){
 if(!shortId_(p.fileId))throw Error("Invalid photo file reference");
 const folder=photoDraftFolder_(p.type);
 const file=DriveApp.getFileById(p.fileId);
 if(!inFolder_(file,folder.getId()))throw Error("Photo folder mismatch");
 if(file.getName()!==photoDraftName_(p.photoId))throw Error("Photo reference mismatch");
 if(!["image/jpeg","image/png"].includes(file.getMimeType()))throw Error("Unrecognized photo format");
 return file;
}
function uploadStudentPhoto_(p){
 const filename=photoDraftName_(p.photoId);
 const folder=photoDraftFolder_(p.type);
 if(!["image/jpeg","image/png"].includes(p.photoMime))throw Error("Invalid photo MIME");
 const base64=String(p.photoBase64||"");
 const blob=prepareBlob_(base64,p.photoMime,filename,2500000);
 const raw=blob.getBytes();
 if(p.photoMime==="image/jpeg"){
   if(raw.length<8||(raw[0]&255)!==255||(raw[1]&255)!==216||(raw[2]&255)!==255||
      (raw[raw.length-2]&255)!==255||(raw[raw.length-1]&255)!==217)throw Error("Invalid JPEG signature");
 }else{
   const sig=[137,80,78,71,13,10,26,10];
   if(raw.length<24||sig.some(function(n,i){return (raw[i]&255)!==n;}))
     throw Error("Invalid PNG signature");
 }
 // Replayed request with same photoId must NEVER create duplicate files.
 const current=findInFolder_(folder,filename);
 if(current){
   if(current.getMimeType()!==p.photoMime)throw Error("Photo reference already exists");
   return {success:true,photoFileId:current.getId(),mime:current.getMimeType(),reused:true};
 }
 const file=folder.createFile(blob);
 return {success:true,photoFileId:file.getId(),mime:file.getMimeType()};
}
function deleteStudentPhoto_(p){
 // Validating both ID AND the private destination prevents arbitrary deletion.
 const file=photoDraftFile_(p);
 file.setTrashed(true);
 return {success:true,deleted:true};
}
function getStudentPhoto_(p){
 const file=photoDraftFile_(p);
 const blob=file.getBlob();
 const bytes=blob.getBytes();
 if(bytes.length>2500000)throw Error("Photo exceeds delivery limit");
 return {success:true,mime:file.getMimeType(),base64:Utilities.base64Encode(bytes)};
}
function verifyStudentPhotoBridge_(){
 // No real student data or saved file. Synthetic photos are always trashed.
 const synthetic="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9wfPkAAAAASUVORK5CYII=";
 const checked=[];
 ["admission","scholarship"].forEach(function(type){
   const folder=photoDraftFolder_(type);
   const id=Utilities.getUuid();
   const filename=photoDraftName_(id);
   let file=null;
   try{
     file=folder.createFile(Utilities.newBlob(Utilities.base64Decode(synthetic),"image/png",filename));
     if(!inFolder_(file,folder.getId()))throw Error(type+" student photo folder cannot be written");
     checked.push(type);
   }finally{if(file)file.setTrashed(true);}
 });
 return {success:true,code:"STUDENT_PHOTO_V3_READY",folders:checked,
   message:"Admission and Scholarship private photo folders verified; synthetic images trashed."};
}

/**
 * Eliminate orphaned photo drafts even after a Worker timeout. Never touches
 * permanent "Student Photo ..." files or course logos/PDFs.
 */
function cleanupStudentPhotoDrafts_(){
 const cutoff=Date.now()-(48*60*60*1000);
 const valid=/^Nitya Student Photo Draft [a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
 let scanned=0,removed=0;
 ["admission","scholarship"].forEach(function(type){
   const files=photoDraftFolder_(type).getFiles();
   let scannedFolder=0;
   while(files.hasNext()&&scannedFolder<2000&&removed<40){
     const file=files.next();
     scannedFolder++;scanned++;
     if(valid.test(file.getName())&&file.getDateCreated().getTime()<cutoff){
       file.setTrashed(true);
       removed++;
     }
   }
 });
 return {success:true,scanned:scanned,removed:removed};
}

function uploadCourseLogo_(p){
 if(!p.photoBase64||!p.photoMime)throw Error("Logo image required");
 const name="Course logo "+String(p.courseId||"")+" "+Utilities.getUuid();
 const blob=prepareBlob_(p.photoBase64,p.photoMime,name,2097152);
 const file=DriveApp.getFolderById(DRIVE_FOLDERS.logos).createFile(blob);
 return {success:true,fileId:file.getId()};
}
function getLogo_(p){
 if(!shortId_(p.fileId))throw Error("Invalid logo id");
 const file=DriveApp.getFileById(p.fileId);
 if(!inFolder_(file,DRIVE_FOLDERS.logos))throw Error("Logo folder mismatch");
 return {success:true,mime:file.getMimeType(),base64:Utilities.base64Encode(file.getBlob().getBytes())};
}
function deleteLogo_(p){
 if(!shortId_(p.fileId))throw Error("Invalid logo id");
 const file=DriveApp.getFileById(p.fileId);
 if(!inFolder_(file,DRIVE_FOLDERS.logos))throw Error("Logo folder mismatch");
 file.setTrashed(true);return {success:true};
}
function fetchPdf_(p){
 if(!shortId_(p.fileId)||!["admission","scholarship"].includes(p.type))throw Error("Invalid PDF request");
 const file=DriveApp.getFileById(p.fileId);
 if(!inFolder_(file,DRIVE_FOLDERS[p.type].pdfs)||file.getMimeType()!==MimeType.PDF)throw Error("PDF access denied");
 const blob=file.getBlob();
 if(blob.getBytes().length>8000000)throw Error("PDF exceeds delivery limit");
 return {success:true,mime:"application/pdf",base64:Utilities.base64Encode(blob.getBytes())};
}
function upsertSheet_(payload){
 if(!["admission","scholarship"].includes(payload.type)||!payload.recordId||!payload.formNumber)throw Error("Invalid Sheet payload");
 const spreadsheetId=PropertiesService.getScriptProperties().getProperty("STAFF_SPREADSHEET_ID");
 if(!spreadsheetId)throw Error("Spreadsheet not configured");
 const sheet=SpreadsheetApp.openById(spreadsheetId).getSheetByName(payload.type==="admission"?"Admissions":"Scholarships");
 if(!sheet)throw Error("Required tab missing");
 const width=sheet.getLastColumn();
 if(width<1)throw Error("Sheet headings missing");
 const headings=sheet.getRange(1,1,1,width).getDisplayValues()[0];
 const keyIndex=headings.findIndex(h=>normalize_(h)===(payload.type==="admission"?"application no":"registration no"));
 if(keyIndex<0)throw Error("Application/Registration No header not found");
 const info=Object.assign({},payload.fields||{},{
  recordId:payload.recordId,formNumber:payload.formNumber,createdAt:payload.createdAt,
  studentName:payload.studentName,mobile:payload.mobile,
  staffId:payload.staffId,staffName:payload.staffName,registrationFee:payload.type==="scholarship"?100:"",
  photoUrl:payload.photoFileId?"https://drive.google.com/file/d/"+payload.photoFileId+"/view":"",
  pdfUrl:payload.pdfFileId?"https://drive.google.com/file/d/"+payload.pdfFileId+"/view":"",
  submissionStatus:"Submitted"
 });
 const data=headings.map(h=>{
  const field=HEADER_KEYS[normalize_(h)];
  const value=field?String(info[field]??""):"";
  return /^[=+@\-\t\r]/.test(value)?"'"+value:value;
 });
 const last=sheet.getLastRow();
 const match=last>1?sheet.getRange(2,keyIndex+1,last-1,1).createTextFinder(String(payload.formNumber)).matchEntireCell(true).findNext():null;
 const row=match?match.getRow():last+1;
 sheet.getRange(row,1,1,width).setNumberFormat("@").setValues([data]);
 return {success:true,row:row};
}

/**
 * Safe, temporary read/write probe. Can be Run from the editor to obtain
 * Google Drive scopes; also callable from the authenticated Web App.
 * Never accepts a user file or student data. Temporary test file is trashed.
 */
function verifyStaffDriveAccess() {
 const folder=DriveApp.getFolderById(DRIVE_FOLDERS.logos);
 const folderName=folder.getName();
 let testFile=null;
 try{
   const marker="NITYA-PORTAL-ACCESS-TEST-"+Utilities.getUuid()+".txt";
   testFile=folder.createFile(Utilities.newBlob("Temporary access check","text/plain",marker));
   if(!testFile || testFile.getName()!==marker)throw Error("Drive test file verification failed");
   Logger.log("Drive read and write successful: "+folderName);
   return {success:true,driveRead:true,driveWrite:true,code:"DRIVE_READ_WRITE_OK"};
 } finally{
   if(testFile)testFile.setTrashed(true);
 }
}

/**
 * No-student PDF smoke test for administrators only, invoked by the Worker
 * with its shared Apps Script secret. NO D1 inserts and NO Sheets writes.
 * Real folder files are only temporary and moved to Trash in finally.
 */
function verifyPdfGeneration_(p){
  const main=DriveApp.getFileById(DRIVE_FOLDERS.mainLogo);
  if(!main || !main.getBlob())throw Error("Academy logo unavailable");
  const photoPlaceholder={getBlob:function(){return main.getBlob();}};
  const results=[];
  const temporary=[];
  const marker="TESTPDF-"+Utilities.getUuid().replace(/-/g,"").slice(0,12);
  try{
    ["admission","scholarship"].forEach(function(type){
      const request={
        type:type,
        recordId:Utilities.getUuid(),
        formNumber:marker+"-"+(type==="admission"?"ADM":"SCH"),
        createdAt:new Date().toISOString(),
        staffName:"TEST SYSTEM",
        staffId:"TEST-ONLY",
        fields:{
          studentName:"TEST ONLY - NOT A STUDENT",
          fatherName:"SAMPLE - NOT REAL",
          gender:"Not applicable",
          mobile:"0000000000",
          course:type==="admission"?"ECCE":"ECCE Scholarship"
        },
        terms:"TEST ONLY. NOT AN ADMISSION OR SCHOLARSHIP REGISTRATION.",
        courseLogoFileId:type==="admission" && p.courseLogoFileId ?p.courseLogoFileId:null
      };
      const pdf=buildPdf_(request,photoPlaceholder,null);
      temporary.push(pdf);
      if(pdf.getMimeType()!==MimeType.PDF || pdf.getSize()<500)
        throw Error(type+" PDF was empty or invalid");
      results.push({type:type,validPdf:true,bytes:pdf.getSize()});
    });
    return {success:true,code:"PDF_GENERATION_OK",tests:results,
      message:"Admission and Scholarship test PDFs generated successfully. Both temporary PDFs were sent to Trash."};
  }finally{
    temporary.forEach(function(file){
      try{file.setTrashed(true);}catch(e){console.error("Test PDF cleanup issue",e);}
    });
  }
}

function doPost(e){
 let locked=false;
 const lock=LockService.getScriptLock();
 try{
  const payload=JSON.parse(e.postData.contents);
  const secret=PropertiesService.getScriptProperties().getProperty("STAFF_SHEETS_SECRET");
  if(!secret||payload.secret!==secret)throw Error("Unauthorized");
  locked=lock.tryLock(25000);
  if(!locked)throw Error("Busy: retry request");
  let result;
  switch(payload.action){
   case "upsert":result=upsertSheet_(payload);break;
   case "saveDocuments":result=saveDocuments_(payload);break;
   case "uploadStudentPhoto":result=uploadStudentPhoto_(payload);break;
   case "getStudentPhoto":result=getStudentPhoto_(payload);break;
   case "deleteStudentPhoto":result=deleteStudentPhoto_(payload);break;
   case "verifyStudentPhoto":result=verifyStudentPhotoBridge_();break;
   case "cleanupStudentPhotoDrafts":result=cleanupStudentPhotoDrafts_();break;
   case "uploadCourseLogo":result=uploadCourseLogo_(payload);break;
   case "getCourseLogo":result=getLogo_(payload);break;
   case "deleteCourseLogo":result=deleteLogo_(payload);break;
   case "getPdf":result=fetchPdf_(payload);break;
   case "verifyDrive":result=verifyStaffDriveAccess();break;
   case "verifyPdf":result=verifyPdfGeneration_(payload);break;
   default:throw Error("Unsupported operation");
  }
  return response_(result);
 }catch(err){
  return response_({success:false,error:String(err.message||err).slice(0,250)});
 }finally{if(locked)lock.releaseLock();}
}
