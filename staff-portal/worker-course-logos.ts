/**
 * Admin-only course PDF logos, privately stored in the academy's Google Drive.
 * Existing extra_logo_active toggle remains independent of course visibility.
 */
import { listStaffCourses } from "./worker-courses";
import { driveRequest,toBase64,fromBase64,type DriveBridgeEnv } from "./worker-drive";
type Env = {DB:D1Database} & DriveBridgeEnv;
const fail=(error:string,status=400)=>Response.json({error},{status,headers:{"Cache-Control":"no-store"}});
const types:Record<string,(b:Uint8Array)=>boolean>={
 "image/png":b=>b.length>=8&&[137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x),
 "image/jpeg":b=>b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255,
 // Apps Script Google Docs PDF image support is reliable for JPEG and PNG only.
};
async function oldLogo(env:Env,id:string){
 return env.DB.prepare("SELECT extra_logo_drive_id FROM staff_courses WHERE course_id=?").bind(id).first<{extra_logo_drive_id:string|null}>();
}
export async function handleCourseLogo(request:Request,env:Env):Promise<Response>{
 const id=new URL(request.url).searchParams.get("id");
 if(request.method==="GET"){
  if(!id)return fail("Select course");
  const logo=await oldLogo(env,id);
  if(!logo?.extra_logo_drive_id)return fail("No logo uploaded",404);
  try{
   const result=await driveRequest(env,{action:"getCourseLogo",fileId:logo.extra_logo_drive_id});
   const buffer=fromBase64(String(result.base64||""));
   return new Response(buffer,{headers:{"Content-Type":String(result.mime||"image/png"),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  }catch(e){console.error("Course logo retrieval failed",e);return fail("Could not retrieve logo",503);}
 }
 if(request.method==="DELETE"){
  if(!id)return fail("Select course");
  const old=await oldLogo(env,id);
  if(!old?.extra_logo_drive_id)return fail("Logo not found",404);
  await env.DB.prepare("UPDATE staff_courses SET extra_logo_drive_id=NULL,extra_logo_active=0 WHERE course_id=?").bind(id).run();
  await driveRequest(env,{action:"deleteCourseLogo",fileId:old.extra_logo_drive_id}).catch(e=>console.error("Logo cleanup failed",e));
  return Response.json({success:true,id});
 }
 if(request.method!=="POST")return fail("Method not allowed",405);
 if(!(request.headers.get("content-type")||"").startsWith("multipart/form-data;"))return fail("Image upload required",415);
 let form:FormData;
 try{form=await request.formData();}catch{return fail("Malformed upload");}
 const idField=form.get("id"),image=form.get("logo");
 if(typeof idField!=="string"||!(image instanceof File))return fail("Select course and image");
 if(image.size<1||image.size>2097152)return fail("Logo size must not exceed 2 MB",413);
 if(!types[image.type])return fail("Please upload JPG or PNG; WEBP is not supported in PDF");
 const bytes=new Uint8Array(await image.arrayBuffer());
 if(!types[image.type](bytes))return fail("Invalid logo image");
 const course=(await listStaffCourses(env)).find(c=>c.id===idField);
 if(!course)return fail("Invalid course",404);
 let logoId:string;
 try{
  const stored=await driveRequest(env,{action:"uploadCourseLogo",courseId:course.id,photoMime:image.type,photoBase64:toBase64(bytes)});
  logoId=String(stored.fileId||"");
  if(!logoId)throw Error("Drive returned no logo reference");
 }catch(e){console.error("Course logo upload error",e);return fail("Google Drive logo upload failed",503);}
 const old=await oldLogo(env,course.id);
 try{
  await env.DB.prepare("INSERT INTO staff_courses(course_id,course_name,active,extra_logo_drive_id,extra_logo_active) VALUES (?,?,?,?,1) ON CONFLICT(course_id) DO UPDATE SET course_name=excluded.course_name,extra_logo_drive_id=excluded.extra_logo_drive_id,extra_logo_active=1").bind(course.id,course.name,course.active?1:0,logoId).run();
 }catch(e){
  await driveRequest(env,{action:"deleteCourseLogo",fileId:logoId}).catch(()=>{});
  console.error("Course logo database update failed",e);
  return fail("Could not save logo configuration",503);
 }
 if(old?.extra_logo_drive_id)await driveRequest(env,{action:"deleteCourseLogo",fileId:old.extra_logo_drive_id}).catch(()=>{});
 return Response.json({success:true,id:course.id,hasLogo:true,logoActive:true});
}
export async function setCourseLogoStatus(request:Request,env:Env):Promise<Response>{
 let data:any;
 try{data=await request.json();}catch{return fail("Invalid request");}
 const {id,active}=data||{};
 if(typeof id!=="string"||typeof active!=="boolean")return fail("Course ID and status required");
 const course=(await listStaffCourses(env)).find(c=>c.id===id);
 if(!course)return fail("Course not found",404);
 const old=await oldLogo(env,id);
 if(active&&!old?.extra_logo_drive_id)return fail("Upload a logo first",409);
 await env.DB.prepare("INSERT INTO staff_courses(course_id,course_name,active,extra_logo_active) VALUES (?,?,?,?) ON CONFLICT(course_id) DO UPDATE SET extra_logo_active=excluded.extra_logo_active").bind(id,course.name,course.active?1:0,active?1:0).run();
 return Response.json({success:true,id,logoActive:active});
}
