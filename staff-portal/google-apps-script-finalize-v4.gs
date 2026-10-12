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
  if(!pdf)pdf=buildPdf_(p,photo,null);
  if(pdf.getMimeType()!==MimeType.PDF||pdf.getSize()<500)throw Error("Generated PDF is invalid");
  if(photo.getName()!==name)photo.setName(name);
  return {success:true,photoFileId:photo.getId(),pdfFileId:pdf.getId(),
    photoName:name,pdfName:pdfName};
}
