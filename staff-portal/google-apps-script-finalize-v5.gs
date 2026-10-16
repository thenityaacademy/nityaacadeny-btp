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
/** Trim the transparent margins of the current Admin-configured ECCE logo in PDFs.
 * Other configured logo IDs continue using their private Drive image unchanged. */
function pdfWordCourseLogoBlob_(fileId){
 if(fileId==="1F-i7Avtb8oi_lXFcC6a7dByMhmak5_zd"){
  var trimmed="iVBORw0KGgoAAAANSUhEUgAAAOgAAABUCAMAAAC/f4tEAAABgFBMVEUAAAAKfa0JfKwKfa0Kfa3glBEKfa0Kfa3flBHekxAKfa0Kfa3flBHflBHflBHflBHflBHflBHglBDglBHglBHglBHglRHglBHZjA3HkSIAbKIJcJ8ARHIAV0AAV6sAaHkFbp0Abf8AecgKgK8Ap0G9UwCiawDglRIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADMSCQxAAAAgHRSTlMA/Q0ssfzOT/QOjm8vz01uj7AOMtNuqpYBFQEBAQEBAQEBAQEBAQFIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIa+L00AAAtjSURBVHja7ZsJl+SoDYBtoMAGl4/q7p3Obu7sJv//H0YS92V3v928NzVp3kxXGRvQB0IImRqGr/SVvtJX+kr/yzTvkLbltx8edJlu0zTdl/8HUEjTnub98stn1WJ+FtDbkYrK+Ccxt+U5Qbn4DOm83af1CUBfKe0Z6Cj5ZzBvFShzqbiMOT4vLfSXxlPx0XbNPuNvRUOx8F9txj/+BGl+PB456EdJ5/WOGlGCMiMoKX8tXDLMTw6jhZSQodifi0KQtFE8yMqUhpwAqukJntRjS1ABdzc0HGrVjOMtzf855KAfI112q/gFKNOjTdplKHc9CmbFE2NI0sGzJI8edajM0KUXh0m6VLYL0jJCsVCJCP0SMviY1RNAP0AKw3m7tUB5gHDtmQyUmQKJZZ0Rku0BR9YALesZYdh9ln/cXysvlK4FlYpduBrTrQ0aZebFYCFTJZ8lrUFH0tdiJBLQRteEPlb5gMKo8WKs0xExZ6TLETj7oMbWJ1MkPjYEbIJSfheUyboA92RuTvPYZWego+6TLvfb7Rq01EoRp9GojdEydLh/iEyHR8D8Lmi7Z1Q2aVQc4FPQYBHOOfugtj2dgrrK7cTwVsn4QsIuBkqGGdUD9RZPGqVUtH5ee+zzOopxDtpT35yzD0rtJfZUBHOhsqYgX2VyOHklOwGVlFRqdKCfdDJpWOyvS9Cx5SXNyfxEzmJPoJqzzAkiMnvs5eIFqJec90ET3yDghQ6zFaWm6RK0ZX23KcPcCqde5QY1u3SCau8ZKS9KAcoLOwoz2qZMIbAWrsJcJxuQ6K5JJlALtLRnmv+aD+g9xyz7ISHDNnQCGqaodkl0QN3I65aRDqDo7shiofKDq+Kc0UMPVBfVynymztvkh3TaGzs0K3PQMRGvREfuYC4/A5o5WJUC4YqSGqYWaMNy5+Z3dovodF9bO1Ens0wl1Z8EHc4LqJbj4RySYMeypaYJWg1pZX7tpmVvb7idzNpWrKxO/OGgrXWUigfd1ZnX0gJteh25UcJB3TqBBSez/eA6uYhztEg90L7qJouW1ErVzqRh2ZLaBk28tswo5ai9AIqT2VZtdximADWsSFdzVPkkcycd+p+z3MFzgCJH64C2SWXbfZiX1joqrKxWYK7K5aXTOyzXKdNdR03L17PF3a1Mc7ugQ23S/KavwjyanpFIZrpkKncYIhDjmKoRVVcOQ4bhm9INP4BfgDYtEulvgblPUwc0ceZ/Vm0X0Hm1lQsYHagLUJ0tE6bewwensgs6BNf6zCiR19sB5S2j6q0RT/fgOgdlXF869SZIw7iR+eiZYqt3Adod1NT9pe13BzT2bOL4tLZpY9imSXLz0vweaFAXKXujlwVKTkGLqExzUJG0AxqcP5kOWCeU0FoWNTvZpsmeY5jprmYnoGm0kJmm/uqMtAeqxsYurPZoqNdVZ/nvbrzNiU9jKvb27iVbRdqoyaDOPasbYzLZ6lFOCKtdqjND+qEU3ffdqvBcb5uWk/LmVI3PLPcOKBOFw+ZsTWbl3IxXHaXpB8dy1cgWvmgILkDHfLlkzUU1VrJ2QJ0KyTAFfRGY+871Dt5WBiqF4Zlhkc24LndWSwpdxHxUqbndjXfhAzWtUihUbLytD4BNt77ljgIrCvEiuyyYX4ZaSlvqa2MnOQ6+9PZaq6r43Gu37y7xdqyzYZWenJR3KBpWSbAfALQRFqutUjvG/YANzeymL3yb5xeYxj4PrvwOD7Pei43Q7D/gD10s+PgD/sRK8c7ygomeg4/F2ol5WV0FL/Ow2Efg5ou97Wuso4A1RqW/rZ0bvk2cjsX5wsf8OPBN8+oci3n3751h31NEY5bptlGYcVow1kgF9tt9Hl5usM8/YqX7/GqjVhvUG4J0GM2iZ6ie8HIIxMGILN7d26CtWGepv6oGXfEECIoHzgQK+/gJLzwoXL0+fDSx8B9fbrc3BL1Z0BvK9w0fR1Csd7M9NS2PVzxlMtlc+KR6NmoYuhFA3wbcV93w3rJOVoBbHoHm/bBYw/7KekhBkH0/oIvfoWXoww4oZBzbkfVxDmqFjqDQM9h7C2YD6LFCIvn3bcM87NZt21cHuqwr9jMoMzrkO+hB+SJXnkRQ6k15rd8AutnpZce1D7ov+RqcgYI+Il4ERXaogpxrAN3tm3qqdyYFTxt+c5Is1k2FyqYyylV5kRVq7n3xpurui1Pc4VR1j3Xug64whEsCSjPejiuq7v31vlFr27zcnXKGOZqB0r55OuaO2e2jZupbDak92nBf3ID2QO07VgTogS6okUcEfQfB1w0nJoK6A1JIB6M17e+2YTQ8FShO3/rYWGvDXUaL0ugZbxw9OnB2oiq990FBsN31RWF1PSjqxBRBaXraiQqg933f18FaXX+CaF6x4QYo6MHe2HCL68BYMlFNiYmrm9MybKinusvyPkdRHCgIDHjwPNGiBUlACZzOuQHotzBRDlinsNyy2oYboPH562hnocD50YQsjgTWdCd7u5LgAXRf0Qb+BELjlx0Wv+2ejSiCHPtB6x2B0nhFULok2UHw1zdIL9SBuPvfsOH73hnRDmgn2llsVEVbd2GUbk4eEuDfHpRWvgNBMa246hVz1L1ipvV98zVYUNJpMmC0ID2cw/CG9a4D6Q6FdWjx/ThoLzCWeRBh3FV5YAU9IzKnqIULgJJnRJJ9e3yzIv4HX+BUrx2XHYcFpdvuZD3AYqEHcHcdArnWvzrulHAcMQce2ME0gIJg4QVvkAny+gJu1TZ0AmNyvAgXBVJVx+5Td3Z+eJ8UEix+1gV9OEd4qGe4ncIz3XvQp7sIufQ5J7fe3Xfn1SZPDUP+rYHaDoyluxrVMbtPljrRouRQmVVwyYbhh0RNJiq5i08LmgV2uW6FilmqvE+7/ea8GFXZDYrTGmOeNsRQRFGS1zjNEDhvH0v+PlPuAZYb7nquxkirKKdoPGH8HSZexn/L0EIVLgp4ynSCqt9jYvVhDX0RWYhh92deXEw7CKgv42JPt8CIdmQhH1T1/KDhoFmJms1U+SMMqe4FUcRl+BqskYKJy2xJNAD0b2jarN/bV1krfQ+IXShvI7KQTVTV7iQ6MKzc+WsBCs+YVLXS4Jmx3w0q0Oj/bFvpmpyTQ/NpkCFHTUmbzh8HM6Y4gdJ52iEFjWu2ku6Vn1/J44LuruI3eyNZ8UMtFnRwrbC/hyZinfi7H5dzRdp5nzxKNXRACYQx6EqjU1Dod1/IjYASQmrINYzhr5ug7/E1MTSoDYpo8D/lcGhYSzs2zH/xoNjKSMVIofA8Dzxs8LvB4CxqmL19FThq7bc7PwKC2vHHWQCioH4tMlCZHGvTxnBYyQxiGskZ9IECGTmAa/yK58YU9puSBnI4H6V7E26S01PGThCsDx9iWFTgcS6hODMKKubg6XFFtfLhMnBU77e7b0dxG6CREg8P5qA8Pb9HHpmBm0JDDygmDSm0Flbb4FIDDnwT0BHwlQcNaoLiVBGaj8IYMXJSGDyILqkKqENDHboXYzjZb5/6CyAvYKKxKkbUhII0pxiCDgkol1xocpgZjIUU8N8w/L0edAqPx6OkFycHhU8+2l/d0SXoihg9aP7zvBMPNyWVom/MYXGxoKBF5YjiohKMUQWqYVZL/IdDM1hM2DOQMcHDqlGCsJYgKHOt4CyGXjH2XKythTE7ooOt42SZUaJhYxk/tddoXyyeZgVoqv/U8yko5IBYqGUSpSbFHWmYIcekoOlOCweb5ig8JNDaQy3cDbDUOKJGapyoWp5qYbLxNh9cw7WGQcVzWfBfKfzLTCUjN1qDQaXxV6DTHPqfCsJ3TRK5GuyzaIMbcjJFtVArtljSPNakYKWDDx5qPQ2tcPy1qpT608v7vz5Rgubo9xBIOlXxP6IF8+xh06/0lb7SV/pc+i/3+pGyVyKZWQAAAABJRU5ErkJggg==";
  return Utilities.newBlob(Utilities.base64Decode(trimmed),"image/png","Medhavi logo cropped");
 }
 return DriveApp.getFileById(fileId).getBlob();
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
      pdfWordImage_(hr,pdfWordCourseLogoBlob_(logo.getId()),158,87,"PROGRAMME LOGO",DocumentApp.HorizontalAlignment.RIGHT);
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
    // If the border frame alone causes an overflow, shrink the frame FIRST.
    // Only reduce row heights in later passes; never destroy all cell spacing.
    for(var layoutPass=1;pages>1&&layoutPass<=3;layoutPass++){
      var tightDoc=DocumentApp.openById(doc.getId());
      pdfWordTighten_(tightDoc.getBody(),layoutPass);
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
function pdfWordTighten_(body,level){
  var frame=body.getTables()[0];
  if(!frame)return;
  frame.getRow(0).setMinimumHeight(level===1?755:745);
  if(level===1)return; // border height only, keeps all full-size tables
  var canvas=frame.getCell(0,0);
  function visit(element){
    var t=element.getType();
    if(t===DocumentApp.ElementType.TABLE){
      var rowCount=element.getNumRows();
      if(rowCount>=1 && element.getRow(0).getNumCells()===4 && rowCount!==2){
        for(var i=0;i<rowCount;i++){
          var row=element.getRow(i);
          row.setMinimumHeight(level===2?20:18);
          for(var j=0;j<4;j++){
            var c=row.getCell(j);
            c.setPaddingTop(level===2?3:2).setPaddingBottom(level===2?3:2);
          }
        }
      }else if(rowCount===1&&element.getRow(0).getNumCells()===1){
        element.getRow(0).setMinimumHeight(level===2?19:18);
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
