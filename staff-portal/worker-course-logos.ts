/**
 * Admin-only course PDF extra logos, stored in a PRIVATE R2 bucket.
 * No bucket binding -> 503. Existing website routes unaffected.
 */
import { listStaffCourses } from "./worker-courses";
type Env = { DB:D1Database; STAFF_FILES?:R2Bucket };
const jsonErr=(error:string,status=400)=>Response.json({error},{status,headers:{"Cache-Control":"no-store"}});
const types:Record<string,{ext:string;valid:(b:Uint8Array)=>boolean}>={
 "image/png":{ext:"png",valid:b=>b.length>=8 && [137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x)},
 "image/jpeg":{ext:"jpg",valid:b=>b.length>=3 && b[0]===255 && b[1]===216 && b[2]===255},
 "image/webp":{ext:"webp",valid:b=>b.length>=12 && [82,73,70,70].every((x,i)=>b[i]===x) && [87,69,66,80].every((x,i)=>b[i+8]===x)}
};
export async function handleCourseLogo(request:Request,env:Env):Promise<Response>{
 const url=new URL(request.url);
 const id=url.searchParams.get("id");
 if(!env.STAFF_FILES)return jsonErr("Private R2 storage is not enabled. Bind STAFF_FILES before uploading logos.",503);
 if(request.method==="GET"){
   if(!id)return jsonErr("Missing Course ID");
   const record=await env.DB.prepare("SELECT extra_logo_r2_key FROM staff_courses WHERE course_id=?").bind(id).first<{extra_logo_r2_key:string|null}>();
   if(!record?.extra_logo_r2_key)return jsonErr("No course logo",404);
   const blob=await env.STAFF_FILES.get(record.extra_logo_r2_key);
   if(!blob)return jsonErr("Logo missing from storage",404);
   return new Response(blob.body,{headers:{"Content-Type":blob.httpMetadata?.contentType||"application/octet-stream","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
 }
 if(request.method==="DELETE"){
   if(!id)return jsonErr("Missing Course ID");
   const record=await env.DB.prepare("SELECT extra_logo_r2_key FROM staff_courses WHERE course_id=?").bind(id).first<{extra_logo_r2_key:string|null}>();
   if(!record?.extra_logo_r2_key)return jsonErr("No course logo",404);
   await env.DB.prepare("UPDATE staff_courses SET extra_logo_r2_key=NULL,extra_logo_active=0 WHERE course_id=?").bind(id).run();
   await env.STAFF_FILES.delete(record.extra_logo_r2_key).catch(e=>console.error("Logo cleanup error",e));
   return Response.json({success:true,id});
 }
 if(request.method!=="POST")return jsonErr("Method not allowed",405);
 if(!(request.headers.get("content-type")||"").startsWith("multipart/form-data;"))return jsonErr("Expected image upload",415);
 let form:FormData;
 try{form=await request.formData();}catch{return jsonErr("Invalid upload");}
 const courseId=form.get("id"),logo=form.get("logo");
 if(typeof courseId!=="string"||!(logo instanceof File))return jsonErr("Missing course or logo");
 if(logo.size<1||logo.size>2097152)return jsonErr("Logo must be below 2 MB",413);
 const type=types[logo.type];if(!type)return jsonErr("PNG, JPG and WEBP only",415);
 const bytes=new Uint8Array(await logo.arrayBuffer());
 if(!type.valid(bytes))return jsonErr("Image format mismatch",415);
 const course=(await listStaffCourses(env)).find(c=>c.id===courseId);
 if(!course)return jsonErr("Course not found",404);
 const old=await env.DB.prepare("SELECT extra_logo_r2_key FROM staff_courses WHERE course_id=?").bind(courseId).first<{extra_logo_r2_key:string|null}>();
 const key="course-logos/"+crypto.randomUUID()+"."+type.ext;
 try{
   await env.STAFF_FILES.put(key,bytes,{httpMetadata:{contentType:logo.type}});
   await env.DB.prepare("INSERT INTO staff_courses(course_id,course_name,active,extra_logo_r2_key,extra_logo_active) VALUES (?,?,?,?,1) ON CONFLICT(course_id) DO UPDATE SET course_name=excluded.course_name,extra_logo_r2_key=excluded.extra_logo_r2_key,extra_logo_active=1").bind(courseId,course.name,course.active?1:0,key).run();
 }catch(e){
   await env.STAFF_FILES.delete(key).catch(()=>{});
   console.error("Course logo upload failed",e);
   return jsonErr("Could not save logo",503);
 }
 if(old?.extra_logo_r2_key)await env.STAFF_FILES.delete(old.extra_logo_r2_key).catch(()=>{});
 return Response.json({success:true,id:courseId,hasLogo:true,logoActive:true});
}
export async function setCourseLogoStatus(request:Request,env:Env):Promise<Response>{
 let body:any;try{body=await request.json();}catch{return jsonErr("Invalid request");}
 const {id,active}=body||{};
 if(typeof id!=="string"||typeof active!=="boolean")return jsonErr("Invalid course status");
 const course=(await listStaffCourses(env)).find(c=>c.id===id);
 if(!course)return jsonErr("Course not found",404);
 const logo=await env.DB.prepare("SELECT extra_logo_r2_key FROM staff_courses WHERE course_id=?").bind(id).first<{extra_logo_r2_key:string|null}>();
 if(active&&!logo?.extra_logo_r2_key)return jsonErr("Upload logo first",409);
 await env.DB.prepare("INSERT INTO staff_courses(course_id,course_name,active,extra_logo_active) VALUES (?,?,?,?) ON CONFLICT(course_id) DO UPDATE SET extra_logo_active=excluded.extra_logo_active").bind(id,course.name,course.active?1:0,active?1:0).run();
 return Response.json({success:true,id,logoActive:active});
}
