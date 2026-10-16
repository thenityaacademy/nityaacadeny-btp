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
/**
 * V6 WORD-STYLE FORM (October 2026):
 * Mirrors the user's NITYA ACADEMY(1).docx reference:
 * institute logo LEFT, title/address CENTER, active programme logo RIGHT;
 * student PHOTO beside the two-row registration block; larger Times New Roman
 * headings, readable outlined tables, spacious declaration/signatures.
 * Every line, fill and border is black/white. Original photos/logos keep color.
 * No recognition heading or invented affiliation claim.
 */
function pdfWordPara_(paragraph,fontSize,bold,alignment){
  paragraph.setSpacingBefore(0).setSpacingAfter(0).setLineSpacing(1);
  if(alignment)paragraph.setAlignment(alignment);
  var text=paragraph.editAsText();
  text.setFontFamily("Times New Roman").setFontSize(fontSize||8.6)
      .setForegroundColor("#000000").setBold(!!bold);
  return paragraph;
}
function pdfWordGap_(body,amount){
  // A small controlled separator, not a full-height blank paragraph.
  var p=body.appendParagraph("");
  pdfWordPara_(p,2,false);
  p.setSpacingBefore(0).setSpacingAfter(Math.max(1,amount||4));
}
function pdfWordCell_(cell,fontSize,bold,padding){
  var pad=padding===undefined?1:padding;
  cell.setPaddingTop(pad).setPaddingBottom(pad)
      .setPaddingLeft(3).setPaddingRight(3).setBackgroundColor("#FFFFFF");
  return pdfWordPara_(cell.getChild(0).asParagraph(),fontSize||8.6,bold);
}
function pdfWordTable_(parent,rows,widths,fontSize,padding,minRowHeight){
  var table=parent.appendTable(rows);
  table.setBorderColor("#000000").setBorderWidth(0.65);
  if(widths){
    widths.forEach(function(w,i){table.setColumnWidth(i,w);});
  }
  for(var r=0;r<rows.length;r++){
    for(var c=0;c<rows[r].length;c++){
      pdfWordCell_(table.getRow(r).getCell(c),fontSize||9.7,c%2===0,padding===undefined?3:padding);
    }
    if(minRowHeight)table.getRow(r).setMinimumHeight(minRowHeight);
  }
  return table;
}
function pdfWordImage_(cell,blob,maxWidth,maxHeight,alt,align){
  var p=cell.getChild(0).asParagraph();
  pdfWordPara_(p,7,false,align||DocumentApp.HorizontalAlignment.CENTER);
  try{
    var im=p.appendInlineImage(blob);
    var ow=Math.max(1,im.getWidth()),oh=Math.max(1,im.getHeight());
    var k=Math.min(maxWidth/ow,maxHeight/oh);
    im.setWidth(Math.max(1,Math.floor(ow*k)));
    im.setHeight(Math.max(1,Math.floor(oh*k)));
  }catch(e){
    pdfWordPara_(p.appendText(alt).getParent().asParagraph(),7,false);
  }
}
function pdfWordSection_(body,heading,pairs,scholarship){
  pdfWordGap_(body,scholarship?7:6);
  var title=body.appendTable([[heading.toUpperCase()]]);
  title.setBorderColor("#000000").setBorderWidth(0.65);
  var headCell=title.getCell(0,0);
  headCell.setBackgroundColor("#FFFFFF").setPaddingTop(3)
       .setPaddingBottom(3).setPaddingLeft(4).setPaddingRight(4);
  pdfWordPara_(headCell.getChild(0).asParagraph(),11.0,true);
  title.getRow(0).setMinimumHeight(20);
  var rows=[];
  for(var i=0;i<pairs.length;i+=2){
    var a=pairs[i],b=pairs[i+1]||["",""];
    rows.push([
      String(a[0]),pdfWordVal_(a[1]),String(b[0]),pdfWordVal_(b[1])
    ]);
  }
  if(rows.length)pdfWordTable_(body,rows,[141,140,141,140],scholarship?11.1:10.5,scholarship?4:3.6,scholarship?22:19);
  title.setColumnWidth(0,562);
}
function pdfWordVal_(value){
  if(value===undefined||value===null||String(value).trim()==="")return "—";
  return String(value);
}
function pdfV5FileName_(p){
  var base="Nitya Academy "+(p.type==="admission"?"Admission":"ECCE Scholarship")+" - "+p.formNumber;
  var rev=Number(p.revisionNumber)||0;
  return base+(rev>0?" - Corrected-"+rev:"")+".pdf";
}
function buildStaffPdf_(p,photoFile,existingPdf){
  if(existingPdf)return existingPdf;
  if(!["admission","scholarship"].includes(p.type)||!p.formNumber)throw Error("Invalid form PDF request");
  var v=p.fields||{},isAdmission=p.type==="admission";
  var folder=getFolder_(isAdmission?"admissions":"scholarships","pdfs");
  var fileName=pdfV5FileName_(p);
  var doc=DocumentApp.create("NITYA PDF TEMP - "+p.formNumber+" - "+p.recordId);
  try{
    var body=doc.getBody();
    body.setPageWidth(595.28).setPageHeight(841.89);
    body.setMarginTop(10).setMarginBottom(10).setMarginLeft(10).setMarginRight(10);

    // One actual enclosing table creates the black PAGE BORDER. It spans
    // almost all of the A4 page, unlike individual floating section outlines.
    var pageFrame=body.appendTable([[""]]);
    pageFrame.setBorderColor("#000000").setBorderWidth(0.9);
    pageFrame.setColumnWidth(0,575);
    pageFrame.getRow(0).setMinimumHeight(775);
    var canvas=pageFrame.getCell(0,0);
    canvas.setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(6).setPaddingRight(6);
    pdfWordPara_(canvas.getChild(0).asParagraph(),1,false);
    var content=canvas;

    // Word reference top header: logos flank centered institute name.
    var h=content.appendTable([["","NITYA ACADEMY",""]]);
    h.setBorderWidth(0);
    [96,299,167].forEach(function(w,i){h.setColumnWidth(i,w);});
    var hl=h.getCell(0,0),hc=h.getCell(0,1),hr=h.getCell(0,2);
    [hl,hc,hr].forEach(function(c){
      c.setPaddingTop(0).setPaddingBottom(0).setPaddingLeft(1).setPaddingRight(1);
    });
    pdfWordImage_(hl,DriveApp.getFileById(DRIVE_FOLDERS.mainLogo).getBlob(),87,87,
      "NITYA ACADEMY",DocumentApp.HorizontalAlignment.LEFT);
    pdfWordPara_(hc.getChild(0).asParagraph(),17,true,DocumentApp.HorizontalAlignment.CENTER);
    [
      "BHARATPUR | EDUCATION & SKILL DEVELOPMENT",
      "Near Ketan Gate, Sahyog Nagar, Bharatpur - 321001",
      "9680008384 | 9802813444"
    ].forEach(function(line,index){
      pdfWordPara_(hc.appendParagraph(line),index===0?10:9.2,index===0,
        DocumentApp.HorizontalAlignment.CENTER);
    });
    if(p.courseLogoFileId){
      var logo=DriveApp.getFileById(p.courseLogoFileId);
      if(!inFolder_(logo,DRIVE_FOLDERS.logos))throw Error("Invalid private programme logo");
      pdfWordImage_(hr,logo.getBlob(),158,87,"PROGRAMME LOGO",DocumentApp.HorizontalAlignment.RIGHT);
    }else pdfWordPara_(hr.getChild(0).asParagraph(),8,false);

    pdfWordGap_(content,3);
    pdfWordPara_(content.appendParagraph(
      isAdmission?"STUDENT ADMISSION APPLICATION FORM":"ECCE SCHOLARSHIP REGISTRATION FORM"
    ),11,true,DocumentApp.HorizontalAlignment.CENTER);

    // Word reference registration area: portrait in LEFT block, two data
    // rows on RIGHT. Nested table avoids a line cutting across the portrait.
    pdfWordGap_(content,5);
    var registration=content.appendTable([["",""]]);
    registration.setBorderWidth(0);
    registration.setColumnWidth(0,91);
    registration.setColumnWidth(1,471);
    var photoCell=registration.getCell(0,0);
    photoCell.setPaddingTop(0).setPaddingBottom(0).setPaddingLeft(0).setPaddingRight(3);
    pdfWordImage_(photoCell,photoFile.getBlob(),84,94,
      "STUDENT PHOTO",DocumentApp.HorizontalAlignment.CENTER);
    var detailCell=registration.getCell(0,1);
    detailCell.setPaddingTop(0).setPaddingBottom(0).setPaddingLeft(0).setPaddingRight(0);
    var nested=pdfWordTable_(detailCell,[
      ["REGISTRATION NO.",p.formNumber,"SUBMITTED ON",
        String(p.createdAt||"").slice(0,19).replace("T"," ")],
      ["PROGRAMME",v.courseName||v.course||(isAdmission?"—":"ECCE Scholarship"),
        "STATUS","SUBMITTED"]
    ],[125,111,105,130],10.2,5);
    nested.getRow(0).setMinimumHeight(47);
    nested.getRow(1).setMinimumHeight(47);
    nested.getRow(0).getCell(1).getChild(0).asParagraph().editAsText().setBold(true);
    if(detailCell.getChild(0).getType()===DocumentApp.ElementType.PARAGRAPH &&
       detailCell.getNumChildren()>1){
      detailCell.getChild(0).removeFromParent();
    }

    pdfWordSection_(content,"1. PERSONAL DETAILS",[
      ["Student's Full Name",v.studentName],["Father's Name",v.fatherName],
      ["Mother's Name",v.motherName],["Date of Birth",v.dob],
      ["Gender",v.gender],["Aadhaar Number",v.aadhaar]
    ],!isAdmission);

    pdfWordSection_(content,"2. CONTACT & ADDRESS",[
      ["Mobile Number",v.mobile],["WhatsApp Number",v.whatsapp||v.mobile],
      ["Email",v.email],["PIN Code",v.pin],
      ["Village / City",v.city],["District",v.district],
      ["State",v.state],["Full Address",v.address]
    ],!isAdmission);

    if(isAdmission){
      pdfWordSection_(content,"3. EDUCATIONAL QUALIFICATIONS",[
        ["10th Passed?",v.passed10],["10th Board",v.board10],
        ["10th Passing Year",v.year10],["10th Marks (%)",v.percent10],
        ["12th Passed?",v.passed12],["12th Board",v.board12],
        ["12th Passing Year",v.year12],["12th Marks (%)",v.percent12],
        ["Last Qualification",v.lastQualification],["Board / University",v.lastBoard],
        ["Last Passing Year",v.lastYear],["Percentage",v.lastPercent]
      ],false);
      pdfWordSection_(content,"4. ADMISSION & FEES",[
        ["Programme",v.courseName||v.course],["Academic Session",v.session],
        ["Total Course Fees (INR)",v.totalFees],["Practical Fees Applicable?",v.practicalApplicable],
        ["Practical Fees (INR)",v.practicalFee],["External Reference?",v.hasReference],
        ["Reference Name",v.referenceName],["Staff ID",p.staffId]
      ],false);
    }else{
      pdfWordSection_(content,"3. QUALIFICATION & SCHOLARSHIP",[
        ["12th Passed?","Yes"],["12th Passing Year",v.year12],
        ["Last Qualification",v.lastQualification],["Board / University",v.lastBoard],
        ["Last Passing Year",v.lastYear],["Percentage",v.lastPercent],
        ["Entrance Test Date",v.examDate],["Scholarship Programme","ECCE"]
      ],true);
      pdfWordSection_(content,"4. REGISTRATION FEE RECORD",[
        ["Registration Fee (INR)","100"],["Payment Mode",v.paymentMode],
        ["Transaction Reference",v.transactionRef],["Payment Status","Record Only"],
        ["Registration Date",v.registrationDate],["Staff ID",p.staffId]
      ],true);
    }

    pdfWordSection_(content,"5. APPLICANT DECLARATION",[
      ["Registration Number",p.formNumber],
      ["Recorded By",String(p.staffName||"")+" ("+String(p.staffId||"")+")"]
    ],!isAdmission);
    pdfWordGap_(content,isAdmission?9:12);
    pdfWordPara_(content.appendParagraph(
      "I declare the information above is correct and consent to the applicable terms and conditions recorded in the Staff Portal. "+
      "This form alone does not guarantee admission, scholarship selection or payment verification."
    ),8.8,false).setSpacingAfter(3);

    pdfWordGap_(content,isAdmission?14:19);
    var signature=content.appendTable([[
      "Student / Guardian Signature: __________________",
      "For Nitya Academy: __________________"
    ]]);
    signature.setBorderColor("#000000").setBorderWidth(0.7);
    signature.setColumnWidth(0,281);
    signature.setColumnWidth(1,281);
    signature.getRow(0).setMinimumHeight(55);
    for(var si=0;si<2;si++){
      var sc=signature.getRow(0).getCell(si);
      sc.setPaddingTop(25).setPaddingBottom(19).setPaddingLeft(7).setPaddingRight(4);
      pdfWordPara_(sc.getChild(0).asParagraph(),11,false);
    }
    pdfWordGap_(content,7);
    pdfWordPara_(content.appendParagraph(
      "NITYA ACADEMY, BHARATPUR  |  Retain your Registration Number and PDF for your records."
    ),7,false,DocumentApp.HorizontalAlignment.CENTER);
    if(Number(p.revisionNumber)>0){
      pdfWordPara_(content.appendParagraph(
        "CORRECTED COPY  |  Revision "+String(p.revisionNumber)
      ),7,true,DocumentApp.HorizontalAlignment.CENTER);
    }

    doc.saveAndClose();
    var pdfBlob=DriveApp.getFileById(doc.getId()).getAs(MimeType.PDF).setName(fileName);
    var rawPdf=pdfBlob.getDataAsString("ISO-8859-1");
    var pages=(rawPdf.match(/\/Type\s*\/Page\b/g)||[]).length;
    if(pages>1){
      // One automatic compact pass protects long names/addresses without
      // changing any submitted values or registration number.
      var tightDoc=DocumentApp.openById(doc.getId());
      var tighterFrame=tightDoc.getBody().getTables()[0];
      if(tighterFrame)tighterFrame.getRow(0).setMinimumHeight(755);
      pdfWordTighten_(tightDoc.getBody());
      tightDoc.saveAndClose();
      pdfBlob=DriveApp.getFileById(doc.getId()).getAs(MimeType.PDF).setName(fileName);
      rawPdf=pdfBlob.getDataAsString("ISO-8859-1");
      pages=(rawPdf.match(/\/Type\s*\/Page\b/g)||[]).length;
    }
    if(pages>1)throw Error("Word-style A4 layout still needs fitting ("+pages+" pages). No PDF replaced; contact Admin.");
    var pdf=folder.createFile(pdfBlob);
    if(pdf.getMimeType()!==MimeType.PDF||pdf.getSize()<500)throw Error("Generated PDF invalid");
    return pdf;
  }finally{
    try{DriveApp.getFileById(doc.getId()).setTrashed(true);}catch(ignore){}
  }
}
/**
 * On rare full-length student names/addresses, Google Docs adds an overflow
 * page. This second pass tightens only whitespace and table cell padding;
 * all original fields, image pixels, and black-outline Word styling remain.
 */
/** Gentle A4 fallback only: keep readable fonts, logos, and tall sign box.
 * Never zero every cell padding as the old fallback did. */
function pdfWordTighten_(body){
  var frame=body.getTables()[0];
  if(!frame)return;
  frame.getRow(0).setMinimumHeight(755);
  var canvas=frame.getCell(0,0);
  function visit(element){
    var t=element.getType();
    if(t===DocumentApp.ElementType.TABLE){
      var rowCount=element.getNumRows();
      if(rowCount>=1 && element.getRow(0).getNumCells()===4 && rowCount!==2){
        for(var i=0;i<rowCount;i++){
          var row=element.getRow(i);
          row.setMinimumHeight(18);
          for(var j=0;j<4;j++){
            var c=row.getCell(j);
            c.setPaddingTop(2).setPaddingBottom(2);
          }
        }
      }else if(rowCount===1&&element.getRow(0).getNumCells()===1){
        element.getRow(0).setMinimumHeight(18);
      }
      for(var n=0;n<rowCount;n++)visit(element.getRow(n));
    }else if(t===DocumentApp.ElementType.TABLE_ROW){
      for(var k=0;k<element.getNumCells();k++)visit(element.getCell(k));
    }else if(t===DocumentApp.ElementType.TABLE_CELL){
      for(var l=0;l<element.getNumChildren();l++)visit(element.getChild(l));
    }
  }
  // Include nested tables but don't touch registration's 47pt photo-aligned rows.
  for(var c=0;c<canvas.getNumChildren();c++)visit(canvas.getChild(c));
}

/** Called by Code.gs web-app router: must be wired for action staffPdfV6Ready. */
function staffPdfV6Ready_(){
  return {success:true,code:"STAFF_PDF_V6_READY",
    template:"NITYA_WORD_A4_2026_10_16",
    message:"One-page black-outline Word-inspired PDF generator is installed."};
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
    fields:{studentName:"TEST STUDENT SAMPLE",fatherName:"SAMPLE FATHER NAME",
      motherName:"SAMPLE MOTHER",aadhaar:"000000000000",
      dob:"2000-01-01",gender:"female",course:"ECCE",courseName:"ECCE",
      mobile:"9000000000",whatsapp:"9000000000",email:"sample.student@example.com",
      pin:"321001",city:"Bharatpur",district:"Bharatpur",state:"Rajasthan",
      address:"Near Ketan Gate, Sahyog Nagar, Bharatpur, Rajasthan - 321001",
      passed10:"yes",board10:"BSER",year10:"2017",percent10:"72",
      passed12:"yes",board12:"BSER",year12:"2019",percent12:"78",
      lastQualification:"12th",lastBoard:"BSER",lastYear:"2019",lastPercent:"78",
      session:"2026",totalFees:"11000",practicalApplicable:"yes",
      practicalFee:"500",hasReference:"no",referenceName:"—",
      examDate:"2026-11-30",registrationDate:"2026-10-16",paymentMode:"cash"},
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
