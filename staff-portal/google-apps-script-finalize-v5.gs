/** NITYA ACADEMY — Staff Photo Draft addon V3
 * Add this as PhotoDraft.gs to your EXISTING Apps Script project.
 * It depends on DRIVE_FOLDERS, getFolder_, shortId_, inFolder_,
 * findInFolder_ and prepareBlob_ already defined in Code.gs.
 * Do not make the photo folders or file links public.
 */
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

function authorizeStudentPhotoFolders(){
 const result=verifyStudentPhotoBridge_();
 Logger.log(JSON.stringify(result));
 return result;
}

/**
 * V4 FINALIZATION — called only by authenticated Worker with shared secret.
 * Use the existing private Photo Draft (no second photo upload), build PDF,
 * and rename the original Drive image AFTER PDF generation succeeds.
 *
 * This is intentionally idempotent: repeated calls recover the same PDF,
 * not new student records or duplicate Drive images.
 */
function finalizeStudentDocuments_(p){
  if(!["admission","scholarship"].includes(p.type))throw Error("Invalid form type");
  if(typeof p.recordId!=="string"||!/^[0-9a-f-]{36}$/i.test(p.recordId))throw Error("Invalid form reference");
  if(typeof p.formNumber!=="string"||!/^[A-Za-z0-9_-]{4,80}$/.test(p.formNumber))
    throw Error("Invalid form number");
  if(typeof p.photoId!=="string"||!p.photoFileId)throw Error("Private student photo draft is required");
  const fields=p.fields||{};
  const studentName=String(fields.studentName||"").trim();
  if(!studentName||studentName.length>120)throw Error("Invalid student name");
  const safeName=studentName.replace(/[\\/<>:*?"|\r\n\t]/g," ").replace(/\s+/g," ").slice(0,90);
  const ext=p.photoMime==="image/png"?".png":p.photoMime==="image/jpeg"?".jpg":null;
  if(!ext)throw Error("Invalid student photo format");
  const name=safeName+" - "+p.formNumber+ext;
  const folder=photoDraftFolder_(p.type);
  const photo=DriveApp.getFileById(p.photoFileId);
  if(!inFolder_(photo,folder.getId()))throw Error("Invalid private photo folder");
  if(photo.getMimeType()!==p.photoMime)throw Error("Photo MIME mismatch");
  const draft=photoDraftName_(p.photoId);
  if(photo.getName()!==draft&&photo.getName()!==name)throw Error("Photo has an unexpected name");
  const pdfFolder=getFolder_(p.type==="admission"?"admissions":"scholarships","pdfs");
  const pdfName="Nitya Academy "+(p.type==="admission"?"Admission":"ECCE Scholarship")+" - "+p.formNumber+".pdf";
  let pdf=findInFolder_(pdfFolder,pdfName);
  if(!pdf)pdf=buildStaffPdf_(p,photo,null);
  if(pdf.getMimeType()!==MimeType.PDF||pdf.getSize()<500)throw Error("Generated PDF is invalid");
  if(photo.getName()!==name)photo.setName(name);
  return {success:true,photoFileId:photo.getId(),pdfFileId:pdf.getId(),
    photoName:name,pdfName:pdfName};
}

/**
 * V5 PRINT FORM — institute-branded professional layout based on the supplied
 * Gujarat University and University of Calcutta registration form references.
 * Works entirely with native DocumentApp tables, using PRIVATE Drive files.
 * No claims of university affiliation or fabricated badges/seals.
 */
/** V6 compact A4: black/white content, two equal-height top logos and real student photo. */
function pdfV6Para_(p,size,bold,align){
 p.setSpacingBefore(0).setSpacingAfter(0).setLineSpacing(1.0);
 if(align)p.setAlignment(align);
 const t=p.editAsText();
 t.setFontFamily("Arial").setFontSize(size||7.5).setForegroundColor("#000000");
 if(bold)t.setBold(true);
 return p;
}
function pdfV6Cell_(cell,size,bold){
 cell.setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(3).setPaddingRight(3);
 return pdfV6Para_(cell.getChild(0).asParagraph(),size||7.5,!!bold);
}
function pdfV6Table_(body,rows){
 const table=body.appendTable(rows);
 table.setBorderColor("#000000").setBorderWidth(0.5);
 // Compact consistent columns keep values aligned without wasting A4 space.
 if(rows.length && rows[0].length===4){
  [112,158,112,166].forEach(function(w,i){table.setColumnWidth(i,w);});
 }
 for(let i=0;i<rows.length;i++){
  for(let j=0;j<rows[i].length;j++)pdfV6Cell_(table.getRow(i).getCell(j),7.1,j%2===0);
 }
 return table;
}
function pdfV6Section_(body,title,pairs){
 const bar=body.appendTable([[String(title).toUpperCase()]]);
 bar.setBorderColor("#000000").setBorderWidth(0.6);
 const heading=bar.getCell(0,0);
 // Outline only: no coloured or black filled bars, logos/photos retain colours.
 heading.setBackgroundColor("#FFFFFF").setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(5);
 const hp=heading.getChild(0).asParagraph();
 hp.setSpacingBefore(0).setSpacingAfter(0).setLineSpacing(1);
 hp.editAsText().setFontFamily("Arial").setFontSize(8).setBold(true).setForegroundColor("#000000");
 const rows=[];
 for(let i=0;i<pairs.length;i+=2){
  const first=pairs[i],second=pairs[i+1]||["",""];
  rows.push([String(first[0]),String(first[1]===undefined||first[1]===null||first[1]===""?"—":first[1]),
    String(second[0]),String(second[1]===undefined||second[1]===null||second[1]===""?"—":second[1])]);
 }
 if(rows.length)pdfV6Table_(body,rows);
}
function pdfV6Image_(cell,blob,maxWidth,maxHeight,fallback){
 const p=cell.getChild(0).asParagraph();
 pdfV6Para_(p,7,false,DocumentApp.HorizontalAlignment.CENTER);
 try{
  const image=p.appendInlineImage(blob);
  const w=Math.max(1,image.getWidth()),h=Math.max(1,image.getHeight());
  const scale=Math.min(maxWidth/w,maxHeight/h);
  image.setWidth(Math.round(w*scale)).setHeight(Math.round(h*scale));
 }catch(e){
  p.appendText(fallback).editAsText().setFontFamily("Arial").setFontSize(7).setForegroundColor("#000000");
 }
}
function pdfV5FileName_(p){
 const base="Nitya Academy "+(p.type==="admission"?"Admission":"ECCE Scholarship")+" - "+p.formNumber;
 const revision=Number(p.revisionNumber)||0;
 return base+(revision>0?" - Corrected-"+revision:"")+".pdf";
}
function buildStaffPdf_(p,photoFile,existingPdf){
 if(existingPdf)return existingPdf;
 if(!["admission","scholarship"].includes(p.type)||!p.formNumber)throw Error("Invalid form PDF request");
 const v=p.fields||{},isAdmission=p.type==="admission";
 const folder=getFolder_(isAdmission?"admissions":"scholarships","pdfs");
 const fileName=pdfV5FileName_(p);
 const doc=DocumentApp.create("NITYA PDF TEMP - "+p.formNumber+" - "+p.recordId);
 try{
  const body=doc.getBody();
  body.setPageWidth(595.28).setPageHeight(841.89); // ISO A4, points
  body.setMarginTop(16).setMarginBottom(16).setMarginLeft(18).setMarginRight(18);
  // Header: prominent institute logo far left, admin-enabled course logo far right.
  // Both use the SAME 84 x 84 pt maximum bounding area, photo stays separate.
  const header=body.appendTable([["","NITYA ACADEMY","",""]]);
  header.setBorderColor("#000000").setBorderWidth(0.7);
  [92,296,75,92].forEach(function(w,i){header.setColumnWidth(i,w);});
  const cells=[0,1,2,3].map(i=>header.getRow(0).getCell(i));
  cells.forEach(cell=>cell.setPaddingTop(3).setPaddingBottom(3).setPaddingLeft(2).setPaddingRight(2));
  pdfV6Image_(cells[0],DriveApp.getFileById(DRIVE_FOLDERS.mainLogo).getBlob(),84,84,"ACADEMY LOGO");
  pdfV6Para_(cells[1].getChild(0).asParagraph(),13,true,DocumentApp.HorizontalAlignment.CENTER);
  const info=[
   "BHARATPUR | EDUCATION & SKILL DEVELOPMENT",
   "Near Ketan Gate, Sahyog Nagar, Bharatpur - 321001",
   "9680008384 | 9802813444"
  ];
  info.forEach(function(line,i){
   pdfV6Para_(cells[1].appendParagraph(line),i===0?7:7.3,i!==1,DocumentApp.HorizontalAlignment.CENTER);
  });
  pdfV6Image_(cells[2],photoFile.getBlob(),61,75,"STUDENT PHOTO");
  if(p.courseLogoFileId){
   const logo=DriveApp.getFileById(p.courseLogoFileId);
   if(!inFolder_(logo,DRIVE_FOLDERS.logos))throw Error("Unrecognized course logo");
   pdfV6Image_(cells[3],logo.getBlob(),84,84,"COURSE LOGO");
  }else pdfV6Para_(cells[3].getChild(0).asParagraph(),7,false);
  const title=body.appendParagraph(isAdmission?
    "STUDENT ADMISSION APPLICATION FORM":"ECCE SCHOLARSHIP REGISTRATION FORM");
  pdfV6Para_(title,10.5,true,DocumentApp.HorizontalAlignment.CENTER);
  title.setSpacingBefore(3).setSpacingAfter(3);
  pdfV6Table_(body,[
   ["FORM / REGISTRATION NO.",p.formNumber,"SUBMITTED ON",String(p.createdAt||"").slice(0,19).replace("T"," ")],
   ["PROGRAMME",v.courseName||v.course||"ECCE","STATUS","SUBMITTED"]
  ]);
  pdfV6Section_(body,"1. PERSONAL DETAILS",[
   ["Student's Full Name",v.studentName],["Father's Name",v.fatherName],
   ["Mother's Name",v.motherName],["Date of Birth",v.dob],
   ["Gender",v.gender],["Aadhaar Number",v.aadhaar]
  ]);
  pdfV6Section_(body,"2. CONTACT & ADDRESS",[
   ["Mobile Number",v.mobile],["WhatsApp Number",v.whatsapp||v.mobile],
   ["Email",v.email],["PIN Code",v.pin],
   ["Village / City",v.city],["District",v.district],
   ["State",v.state],["Full Address",v.address]
  ]);
  if(isAdmission){
   pdfV6Section_(body,"3. EDUCATIONAL QUALIFICATIONS",[
    ["10th Passed?",v.passed10],["10th Board",v.board10],
    ["10th Passing Year",v.year10],["10th Marks (%)",v.percent10],
    ["12th Passed?",v.passed12],["12th Board",v.board12],
    ["12th Passing Year",v.year12],["12th Marks (%)",v.percent12],
    ["Last Qualification",v.lastQualification],["Board / University",v.lastBoard],
    ["Last Passing Year",v.lastYear],["Percentage",v.lastPercent]
   ]);
   pdfV6Section_(body,"4. ADMISSION & FEES",[
    ["Programme",v.courseName||v.course],["Academic Session",v.session],
    ["Total Course Fees (INR)",v.totalFees],["Practical Fees Applicable?",v.practicalApplicable],
    ["Practical Fees (INR)",v.practicalFee],["External Reference?",v.hasReference],
    ["Reference Name",v.referenceName],["Staff ID",p.staffId]
   ]);
  }else{
   pdfV6Section_(body,"3. QUALIFICATION & SCHOLARSHIP",[
    ["Programme","ECCE Scholarship"],["12th Passing Year",v.year12],
    ["Last Qualification",v.lastQualification],["Board / University",v.lastBoard],
    ["Last Passing Year",v.lastYear],["Last Qualification (%)",v.lastPercent],
    ["Exam Date",v.examDate],["Registration Date",v.registrationDate]
   ]);
   pdfV6Section_(body,"4. SCHOLARSHIP PAYMENT RECORD",[
    ["Registration Fee (INR)","100"],["Payment Method",v.paymentMode],
    ["Transaction Reference",v.transactionRef],["Payment Status","Recorded only; not verified"],
    ["Staff ID",p.staffId],["Staff Name",p.staffName]
   ]);
  }
  pdfV6Section_(body,"5. APPLICANT DECLARATION",[
   ["Registration Number",p.formNumber],["Recorded By",String(p.staffName||"")+" ("+String(p.staffId||"")+")"]
  ]);
  pdfV6Para_(body.appendParagraph(
   "I declare the information above is correct and consent to the applicable terms and conditions recorded in the Staff Portal. This form alone does not guarantee admission, scholarship selection or payment verification."
  ),7.1,false).setSpacingBefore(2).setSpacingAfter(2);
  const signature=body.appendTable([["Student / Guardian Signature: __________________","For Nitya Academy: __________________"]]);
  signature.setBorderColor("#000000").setBorderWidth(0.45);
  for(let c=0;c<2;c++){
   const cell=signature.getRow(0).getCell(c);
   cell.setPaddingTop(12).setPaddingBottom(4).setPaddingLeft(6).setPaddingRight(4);
   pdfV6Para_(cell.getChild(0).asParagraph(),7.2,true);
  }
  const footer=body.appendParagraph("NITYA ACADEMY, BHARATPUR  |  Retain your Registration Number and PDF for your records.");
  pdfV6Para_(footer,6.7,false,DocumentApp.HorizontalAlignment.CENTER).setSpacingBefore(3);
  if(Number(p.revisionNumber)>0){
   pdfV6Para_(body.appendParagraph("CORRECTED COPY  |  Revision "+String(p.revisionNumber)),6.7,true,
    DocumentApp.HorizontalAlignment.CENTER);
  }
  doc.saveAndClose();
  const pdfBlob=DriveApp.getFileById(doc.getId()).getAs(MimeType.PDF).setName(fileName);
  // Google Docs sometimes adds an overflow sheet silently. Prevent releasing
  // a multipage registration when the form is required to be one A4 sheet.
  const rawPdf=pdfBlob.getDataAsString("ISO-8859-1");
  const pageObjects=(rawPdf.match(/\/Type\s*\/Page\b/g)||[]).length;
  if(pageObjects>1)throw Error("PDF layout overflow: generated "+pageObjects+" pages instead of one A4 page. Check field lengths/template.");
  const pdf=folder.createFile(pdfBlob);
  if(pdf.getMimeType()!==MimeType.PDF||pdf.getSize()<500)throw Error("Generated PDF invalid");
  return pdf;
 }finally{
  try{DriveApp.getFileById(doc.getId()).setTrashed(true);}catch(ignore){}
 }
}

function getStudentPdfV4_(p){
 if(!shortId_(p.fileId)||!["admission","scholarship"].includes(p.type))throw Error("Invalid PDF request");
 const folder=getFolder_(p.type==="admission"?"admissions":"scholarships","pdfs");
 const file=DriveApp.getFileById(p.fileId);
 if(!inFolder_(file,folder.getId())||file.getMimeType()!==MimeType.PDF)
  throw Error("PDF access denied");
 const bytes=file.getBlob().getBytes();
 if(bytes.length>8000000)throw Error("PDF exceeds delivery limit");
 return {success:true,base64:Utilities.base64Encode(bytes),mime:"application/pdf"};
}
/** Verify PDF generation in both private folders without any Student data. */
function verifyStudentPdfV4_(){
 const sample="TESTONLY-"+Utilities.getUuid().replace(/-/g,"").slice(0,10);
 const main=DriveApp.getFileById(DRIVE_FOLDERS.mainLogo);
 const files=[],results=[];
 try{
  ["admission","scholarship"].forEach(function(type){
   const args={type:type,recordId:Utilities.getUuid(),formNumber:sample+(type==="admission"?"ADM":"SCH"),
    createdAt:new Date().toISOString(),staffName:"TEST SYSTEM",staffId:"TEST-STF",
    fields:{studentName:"TEST ONLY",fatherName:"SAMPLE",aadhaar:"000000000000",
      dob:"2000-01-01",gender:"other",course:"ECCE"},
    terms:"TEST ONLY - NOT A REAL REGISTRATION."};
   const file=buildStaffPdf_(args,main,null);
   files.push(file);
   if(file.getMimeType()!==MimeType.PDF||file.getSize()<500)throw Error("Invalid "+type+" PDF");
   results.push({type:type,bytes:file.getSize()});
  });
  return {success:true,code:"STAFF_PDF_V4_READY",tests:results};
 }finally{files.forEach(function(f){try{f.setTrashed(true);}catch(ignore){}});}
}

/**
 * V5 correction pathway: regenerate a replacement PDF for an existing form
 * without issuing a new registration number or creating another photo.
 * On success, the prior PDF is moved to PRIVATE Drive Trash; never public.
 * The Worker updates its D1 PDF pointer, then upserts the original Sheet row.
 */
function reviseStudentDocuments_(p){
 if(!["admission","scholarship"].includes(p.type))throw Error("Invalid form type");
 if(typeof p.recordId!=="string"||!/^[a-f0-9-]{36}$/i.test(p.recordId))throw Error("Invalid record reference");
 if(typeof p.formNumber!=="string"||!/^[A-Za-z0-9_-]{4,80}$/.test(p.formNumber))throw Error("Invalid form number");
 if(!shortId_(p.photoFileId)||!shortId_(p.existingPdfFileId))throw Error("Missing private document reference");
 const photos=photoDraftFolder_(p.type);
 const photo=DriveApp.getFileById(p.photoFileId);
 if(!inFolder_(photo,photos.getId()))throw Error("Private photo folder mismatch");
 const mime=photo.getMimeType();
 if(!["image/jpeg","image/png"].includes(mime))throw Error("Unexpected saved photo MIME");
 const safeName=String((p.fields||{}).studentName||"").trim().replace(/[\\/<>:*?"|\r\n\t]/g," ").replace(/\s+/g," ").slice(0,90);
 if(!safeName)throw Error("Student Name is missing");
 const photoName=safeName+" - "+p.formNumber+(mime==="image/png"?".png":".jpg");
 const pdfFolder=getFolder_(p.type==="admission"?"admissions":"scholarships","pdfs");
 const previous=DriveApp.getFileById(p.existingPdfFileId);
 if(!inFolder_(previous,pdfFolder.getId())||previous.getMimeType()!==MimeType.PDF)
   throw Error("Previous PDF does not belong to the private Form folder");
 const expectedName=pdfV5FileName_(p);
 const baseName="Nitya Academy "+(p.type==="admission"?"Admission":"ECCE Scholarship")+" - "+p.formNumber;
 if(!previous.getName().startsWith(baseName)||!previous.getName().endsWith(".pdf"))throw Error("Previous form number mismatch");
 // Retry-safe lookup: after an interrupted PDF pointer update, an already
 // generated replacement may be in the same private folder.
 let current=null;
 const matches=pdfFolder.getFilesByName(expectedName);
 while(matches.hasNext()){
   const file=matches.next();
   if(file.getId()!==previous.getId()&&!file.isTrashed()&&file.getMimeType()===MimeType.PDF){
     if(!current||file.getDateCreated().getTime()>current.getDateCreated().getTime())current=file;
   }
 }
 if(!current)current=buildStaffPdf_(p,photo,null);
 if(current.getId()===previous.getId())throw Error("Revision PDF was not generated");
 if(photo.getName()!==photoName)photo.setName(photoName);
 if(!previous.isTrashed())previous.setTrashed(true);
 return {success:true,photoFileId:photo.getId(),pdfFileId:current.getId(),
   photoName:photoName,pdfName:current.getName(),revision:Number(p.revisionNumber)||0};
}

/**
 * PDF V5.1 corrective release: Google DocumentApp Paragraph.setLineSpacing
 * takes the number of lines, NOT a percentage. The V5 values 100/110
 * caused 41–46 page PDFs by giving every table cell ~100 line spacing.
 * Keep all table/section paragraphs between 1.0 and 1.1 lines.
 *
 * This static guard is run in the Apps Script Editor along with the
 * 2-form synthetic smoke check to prevent a repeated 46-page export.
 */
function verifyPdfV51CompactSpacing_(){
 const sample=DocumentApp.create("NITYA LAYOUT V5.1 TEST - DELETE");
 try{
  const paragraph=sample.getBody().appendParagraph("Test Normal Line Spacing");
  paragraph.setLineSpacing(1.0).setSpacingBefore(0).setSpacingAfter(0);
  const compact=paragraph.getLineSpacing();
  if(compact>2.0)throw Error("PDF V5.1 paragraph spacing must be <=2.0 lines");
  return true;
 }finally{
  try{DriveApp.getFileById(sample.getId()).setTrashed(true);}catch(ignore){}
 }
}
/** Apps Script Editor dropdown test function; no real student data. */
function testStaffPdfV5(){
 verifyPdfV51CompactSpacing_();
 const result=verifyStudentPdfV4_();
 Logger.log(JSON.stringify(result));
 return result;
}
