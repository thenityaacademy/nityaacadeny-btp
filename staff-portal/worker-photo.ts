/**
 * Staff-owned, short-lived PRIVATE photo drafts. No PII is stored in D1.
 * This feature is behind STAFF_PHOTO_UPLOADS_ENABLED until V3 Apps Script
 * and the dedicated Test D1 migration are verified.
 */
import { driveReady,driveRequest,toBase64,type DriveBridgeEnv } from "./worker-drive";

export type PhotoEnv = {DB:D1Database;STAFF_PHOTO_UPLOADS_ENABLED?:string}&DriveBridgeEnv;
type Staff={id:string;name:string};
type DraftRow={id:string;staff_id:string;kind:"admission"|"scholarship";drive_file_id:string|null;mime:string;size_bytes:number;status:string;expires_at:string};
const PHOTO_MAX=2500000;
const REQUEST_MAX=3500000;
const DRAFT_LIFETIME=48*60*60*1000;
const MAX_DRAFTS_PER_STAFF=4;
const idRegex=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fileIdRegex=/^[A-Za-z0-9_-]{8,150}$/;
const goodKind=(x:unknown):x is "admission"|"scholarship"=>x==="admission"||x==="scholarship";
export const photoEnabled=(env:PhotoEnv)=>env.STAFF_PHOTO_UPLOADS_ENABLED==="true"&&driveReady(env);
const result=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});

class PhotoError extends Error{constructor(message:string,public status=400){super(message);}}
function validSize(w:number,h:number){return Number.isInteger(w)&&Number.isInteger(h)&&w>=32&&h>=32&&w<=8000&&h<=8000&&w*h<=24000000;}
function validImage(bytes:Uint8Array,mime:string){
 if(mime==="image/png"){
  const signature=[137,80,78,71,13,10,26,10];
  if(bytes.length<45||!signature.every((v,i)=>bytes[i]===v))return false;
  if(String.fromCharCode(...bytes.subarray(12,16))!=="IHDR")return false;
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const validEnd=bytes.length>=57 &&
   bytes[bytes.length-12]===0 && bytes[bytes.length-11]===0 &&
   bytes[bytes.length-10]===0 && bytes[bytes.length-9]===0 &&
   String.fromCharCode(...bytes.subarray(bytes.length-8,bytes.length-4))==="IEND";
  return validEnd && validSize(view.getUint32(16),view.getUint32(20));
 }
 if(mime!=="image/jpeg"||bytes.length<100||bytes[0]!==255||bytes[1]!==216||
    bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)return false;
 let at=2;
 while(at<bytes.length-10){
  if(bytes[at]!==255){at++;continue;}
  while(bytes[at]===255)at++;
  const marker=bytes[at++];
  if(marker===217||marker===218)break;
  if((marker>=208&&marker<=215)||marker===1)continue;
  if(at+2>bytes.length)return false;
  const length=(bytes[at]<<8)+bytes[at+1];
  if(length<2||at+length>bytes.length)return false;
  const sof=[192,193,194,195,198,199,201,202,203,205,206,207];
  if(sof.includes(marker)){
   if(length<7)return false;
   const height=(bytes[at+3]<<8)+bytes[at+4];
   const width=(bytes[at+5]<<8)+bytes[at+6];
   return validSize(width,height);
  }
  at+=length;
 }
 return false;
}
async function boundedForm(request:Request):Promise<FormData>{
 const ctype=request.headers.get("Content-Type")||"";
 if(!/^multipart\/form-data\s*;/i.test(ctype))throw new PhotoError("Choose a JPG or PNG photo.",415);
 const announced=Number(request.headers.get("Content-Length")||0);
 if(announced>REQUEST_MAX)throw new PhotoError("Photo upload request is too large.",413);
 if(!request.body)throw new PhotoError("Photo is missing.");
 const reader=request.body.getReader();
 const chunks:Uint8Array[]=[];
 let total=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   total+=value.byteLength;
   if(total>REQUEST_MAX){void reader.cancel();throw new PhotoError("Photo upload exceeds 2.5 MB.",413);}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const body=new Uint8Array(total);
 let offset=0;
 for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
 try{
  return await new Response(body,{headers:{"Content-Type":ctype}}).formData();
 }catch{return Promise.reject(new PhotoError("Could not read photo file."));}
}
async function findDraft(env:PhotoEnv,id:string,staffId:string,kind:string):Promise<DraftRow|null>{
 return env.DB.prepare("SELECT id,staff_id,kind,drive_file_id,mime,size_bytes,status,expires_at "+
   "FROM staff_photo_drafts WHERE id=? AND staff_id=? AND kind=?").bind(id,staffId,kind).first<DraftRow>();
}
async function removeDrive(env:PhotoEnv,row:DraftRow){
 if(!row.drive_file_id)return;
 await driveRequest(env,{action:"deleteStudentPhoto",type:row.kind,photoId:row.id,fileId:row.drive_file_id});
}
function canRecoverMissing(error:unknown){
 const s=String(error instanceof Error?error.message:error);
 return /not found|no item with the given|does not exist|file does not exist|trashed/i.test(s);
}
async function deleteDraft(env:PhotoEnv,row:DraftRow){
 try{await removeDrive(env,row);}
 catch(e){if(!canRecoverMissing(e))throw e;}
 await env.DB.prepare("DELETE FROM staff_photo_drafts WHERE id=? AND staff_id=?")
   .bind(row.id,row.staff_id).run();
}
async function readBodyJson(request:Request):Promise<Record<string,unknown>|null>{
 if(!/^application\/json(?:;|$)/i.test(request.headers.get("Content-Type")||""))return null;
 if(Number(request.headers.get("Content-Length")||0)>1024)return null;
 const text=await request.text();
 if(text.length>1024)return null;
 try{const v=JSON.parse(text);return v&&typeof v==="object"&&!Array.isArray(v)?v:null;}
 catch{return null;}
}
export async function handleStaffPhoto(request:Request,env:PhotoEnv,staff:Staff):Promise<Response>{
 const path=new URL(request.url).pathname;
 if(!photoEnabled(env))return result({error:"Photo upload is not enabled yet. Please use photo preview only."},503);
 try{
  if(path==="/api/staff/photo/upload"&&request.method==="POST"){
   const form=await boundedForm(request);
   const kind=form.get("kind");
   const photo=form.get("photo");
   if(!goodKind(kind))throw new PhotoError("Invalid Admission or Scholarship form.");
   if(form.get("consent")!=="yes")throw new PhotoError("Confirm student or guardian photo consent.");
   if(!(photo instanceof File))throw new PhotoError("Please select a photo.");
   if(photo.size<1||photo.size>PHOTO_MAX)throw new PhotoError("Photo must be under 2.5 MB.",413);
   if(!["image/jpeg","image/png"].includes(photo.type))throw new PhotoError("Only JPG or PNG photos are allowed.",415);
   const bytes=new Uint8Array(await photo.arrayBuffer());
   if(!validImage(bytes,photo.type))throw new PhotoError("Photo file is invalid or dimensions are unsupported.",415);
   const now=new Date(),expiresAt=new Date(now.getTime()+DRAFT_LIFETIME).toISOString();
   // Shared D1 quota for active drafts; no student names or Aadhaar stored here.
   const id=crypto.randomUUID();
   // Atomic insert+quota enforcement in D1; concurrent requests cannot bypass
   // the private draft allowance. Already-expired drafts don't count.
   const inserted=await env.DB.prepare(
    "INSERT INTO staff_photo_drafts(id,staff_id,kind,mime,size_bytes,status,expires_at) "+
    "SELECT ?,?,?,?,?,'uploading',? WHERE "+
    "(SELECT COUNT(*) FROM staff_photo_drafts WHERE staff_id=? AND expires_at>?)<? "+
    "RETURNING id"
   ).bind(id,staff.id,kind,photo.type,photo.size,expiresAt,
     staff.id,now.toISOString(),MAX_DRAFTS_PER_STAFF).first<{id:string}>();
   if(!inserted)
    throw new PhotoError("Maximum 4 active photo drafts. Remove an old draft before uploading.",429);
   let fileId="";
   try{
    const response=await driveRequest(env,{action:"uploadStudentPhoto",type:kind,
      photoId:id,photoMime:photo.type,photoBase64:toBase64(bytes)});
    fileId=String(response.photoFileId||"");
    if(!fileIdRegex.test(fileId))throw new Error("Invalid private photo reference from storage");
    await env.DB.prepare(
     "UPDATE staff_photo_drafts SET drive_file_id=?,status='ready' WHERE id=? AND staff_id=? AND status='uploading'"
    ).bind(fileId,id,staff.id).run();
   }catch(e){
    if(fileId){
     await driveRequest(env,{action:"deleteStudentPhoto",type:kind,photoId:id,fileId}).catch(()=>{});
    }
    await env.DB.prepare("DELETE FROM staff_photo_drafts WHERE id=? AND staff_id=?").bind(id,staff.id).run().catch(()=>{});
    const raw=String(e instanceof Error?e.message:e);
    console.error("Private student photo draft upload failed",{staffId:staff.id,kind,error:raw.slice(0,180)});
    if(/Unsupported operation|OLD_DEPLOYMENT/i.test(raw))
      return result({error:"Google Apps Script V3 must be deployed before private photo uploads can work."},503);
    return result({error:"Google Drive photo upload failed. Please check the configured Apps Script deployment."},503);
   }
   return result({success:true,photoId:id,kind,mime:photo.type,size:photo.size,expiresAt,
     note:"Private draft only. It is not an admission or scholarship registration."},201);
  }

  if(path==="/api/staff/photo/delete"&&request.method==="POST"){
   const data=await readBodyJson(request);
   const id=data?.photoId,kind=data?.kind;
   if(typeof id!=="string"||!idRegex.test(id)||!goodKind(kind))
     throw new PhotoError("Invalid draft photo reference.");
   const row=await findDraft(env,id,staff.id,kind);
   if(!row)return result({error:"Private photo draft not found."},404);
   await deleteDraft(env,row);
   return result({success:true,deleted:true});
  }

  if(path==="/api/staff/photo/status"&&request.method==="GET"){
   const url=new URL(request.url);
   const id=url.searchParams.get("photoId"),kind=url.searchParams.get("kind");
   if(!id||!idRegex.test(id)||!goodKind(kind))throw new PhotoError("Invalid draft photo reference.");
   const row=await findDraft(env,id,staff.id,kind);
   if(!row||row.status!=="ready"||row.expires_at<=new Date().toISOString())
    return result({error:"Draft photo is not available."},404);
   return result({ready:true,photoId:row.id,kind:row.kind,mime:row.mime,expiresAt:row.expires_at});
  }
  return result({error:"Unsupported photo operation."},405);
 }catch(e){
  if(e instanceof PhotoError)return result({error:e.message},e.status);
  console.error("Staff photo request failed",e);
  return result({error:"Private photo operation could not be completed. Please try again."},503);
 }
}
/** Daily cleanup: expired photo drafts are trashed from their private Drive folders.
 * Missing remote files can be pruned; transient API failures are retried next run.
 */
export async function cleanupExpiredStaffPhotos(env:PhotoEnv,max=20){
 if(!driveReady(env))return {checked:0,cleaned:0};
 const expired=await env.DB.prepare(
  "SELECT id,staff_id,kind,drive_file_id,mime,size_bytes,status,expires_at FROM staff_photo_drafts "+
  "WHERE expires_at<=? ORDER BY expires_at LIMIT ?"
 ).bind(new Date().toISOString(),max).all<DraftRow>();
 let cleaned=0;
 for(const row of expired.results){
  try{
   await deleteDraft(env,row);
   cleaned++;
  }catch(e){
   console.error("Failed to clean expired private photo draft",{photoId:row.id,error:String(e).slice(0,110)});
  }
 }
 return {checked:expired.results.length,cleaned};
}
