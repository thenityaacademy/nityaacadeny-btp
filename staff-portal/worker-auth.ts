import { driveReady,driveRequest,fromBase64,probeDriveBridge } from "./worker-drive";
import { handleCourseLogo,setCourseLogoStatus } from "./worker-course-logos";
import { listStaffCourses } from "./worker-courses";
import { syncApplications } from "./worker-sheets";
import { saveStaffApplication } from "./worker-applications";
/**
 * Staff-only API handler for Cloudflare Workers.
 * Call handleStaffAuth(request, env, isAdmin) BEFORE the static asset fallback.
 * isAdmin must be derived from existing, verified server-side admin session.
 * Returns null for routes this module does not handle.
 */
const COOKIE = "nitya_staff_session";
const ttlMs = 8 * 60 * 60 * 1000;
// Workers WebCrypto limits PBKDF2 to 100,000 iterations per deriveBits operation.
// Before production release: evaluate a memory-hard KDF and implement login rate limiting.
const encoder = new TextEncoder();
const json = (body: unknown, status = 200, headers: Record<string,string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,"0")).join("");
const sha = async (s: string) => hex(await crypto.subtle.digest("SHA-256",encoder.encode(s)));
const random = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b=>b.toString(16).padStart(2,"0")).join("");
};
async function passwordHash(password: string, salt = random()) {
  const material = await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name:"PBKDF2",salt:encoder.encode(salt),iterations:100000,hash:"SHA-256" },material,256);
  return "pbkdf2-sha256$100000$" + salt + "$" + hex(hash);
}
async function verifyPassword(password: string, stored: string) {
  const parts=stored.split("$");
  if(parts.length!==4 || parts[0]!=="pbkdf2-sha256" || parts[1]!=="100000") return false;
  const attempted=await passwordHash(password,parts[2]);
  const a=encoder.encode(attempted),b=encoder.encode(stored);
  if(a.length!==b.length) return false;
  let diff=0; for(let i=0;i<a.length;i++) diff|=a[i]^b[i];
  return diff===0;
}
function cookie(request: Request) {
  const entry=request.headers.get("cookie")?.split(";").map(c=>c.trim()).find(c=>c.startsWith(COOKIE+"="));
  return entry?.slice(COOKIE.length+1) ?? "";
}
function forbidCrossSite(request: Request) {
  if(["POST","PUT","PATCH","DELETE"].includes(request.method)) {
    const origin=request.headers.get("Origin");
    if (!origin || origin!==new URL(request.url).origin) return true;
  }
  return false;
}
type Env = { DB: D1Database; STAFF_SHEETS_URL?:string; STAFF_SHEETS_SECRET?:string; STAFF_SUBMISSIONS_ENABLED?:string };
async function session(request: Request, env: Env) {
  const token=cookie(request);
  if(!/^[0-9a-f]{64}$/.test(token)) return null;
  const hash=await sha(token);
  return env.DB.prepare(`SELECT staff.id,staff.full_name AS name FROM staff_sessions
    INNER JOIN staff ON staff.id=staff_sessions.staff_id
    WHERE staff_sessions.token_hash=? AND staff_sessions.revoked_at IS NULL
    AND staff_sessions.expires_at > ? AND staff.active=1`).bind(hash,new Date().toISOString()).first<{id:string,name:string}>();
}
async function credentials(request: Request) {
  if((request.headers.get("content-type")||"").split(";")[0]!=="application/json") return null;
  return request.json().catch(()=>null);
}
const clearedCookie = COOKIE+"=; Path=/api/staff; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
export async function handleStaffAuth(request: Request, env: Env, isAdmin: boolean): Promise<Response|null> {
  const {pathname}=new URL(request.url);
  if(!pathname.startsWith("/api/staff/") && !pathname.startsWith("/api/admin/staff/")) return null;
  if(forbidCrossSite(request)) return json({error:"Invalid request origin"},403);
  const post=request.method==="POST";
  if(pathname==="/api/staff/login" && post) {
    const {staffId,password}=await credentials(request)||{};
    if(typeof staffId!=="string"||typeof password!=="string"||staffId.length>100||password.length>256) return json({error:"Invalid credentials"},400);
    const staff=await env.DB.prepare("SELECT id, password_hash,active FROM staff WHERE id=?").bind(staffId.trim()).first<{id:string,password_hash:string,active:number}>();
    if(!staff || !staff.active || !(await verifyPassword(password,staff.password_hash))) return json({error:"Invalid username or password"},401);
    const token=random();
    await env.DB.prepare("INSERT INTO staff_sessions(token_hash,staff_id,expires_at) VALUES (?,?,?)").bind(await sha(token),staff.id,new Date(Date.now()+ttlMs).toISOString()).run();
    await env.DB.prepare("UPDATE staff SET last_login_at=CURRENT_TIMESTAMP WHERE id=?").bind(staff.id).run();
    return json({success:true},200,{"Set-Cookie":COOKIE+"="+token+"; Path=/api/staff; HttpOnly; Secure; SameSite=Strict; Max-Age="+(ttlMs/1000)});
  }
  if(pathname==="/api/staff/session" && request.method==="GET") {
    const staff=await session(request,env);
    return json(staff?{authenticated:true,staff}:{authenticated:false});
  }
  if(pathname==="/api/staff/logout" && post) {
    const token=cookie(request);
    if(/^[0-9a-f]{64}$/.test(token)) await env.DB.prepare("UPDATE staff_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE token_hash=?").bind(await sha(token)).run();
    return json({success:true},200,{"Set-Cookie":clearedCookie});
  }
  if(pathname==="/api/staff/dashboard" && request.method==="GET") {
    const staff=await session(request,env);
    if(!staff) return json({error:"Unauthorized"},401);
    const counts=await env.DB.prepare("SELECT kind, COUNT(*) AS n FROM student_applications WHERE staff_id=? GROUP BY kind").bind(staff.id).all<{kind:string,n:number}>();
    const get=(kind:string)=>counts.results.find(x=>x.kind===kind)?.n||0;
    return json({counts:{enquiries:0,admissions:get("admission"),scholarships:get("scholarship")}});
  }
  if(pathname==="/api/staff/config" && request.method==="GET") {
    const staff=await session(request,env);
    if(!staff) return json({error:"Unauthorized"},401);
    const [settings,courses]=await Promise.all([
      env.DB.prepare("SELECT setting_key,setting_value FROM portal_settings").all<{setting_key:string,setting_value:string}>(),
      listStaffCourses(env)
    ]);
    const settingsMap=Object.fromEntries(settings.results.map(s=>[s.setting_key,s.setting_value]));
    return json({enquiryUrl:settingsMap.enquiryUrl||"",admissionTerms:settingsMap.admissionTerms||"",
      scholarshipTerms:settingsMap.scholarshipTerms||"",courses:courses.filter(c=>c.active),
      photoStorageEnabled:driveReady(env),
      submissionsEnabled:driveReady(env) && env.STAFF_SUBMISSIONS_ENABLED==="true"});
  }
  if((pathname==="/api/staff/admission" || pathname==="/api/staff/scholarship") && post) {
    const staff=await session(request,env);
    if(!staff) return json({error:"Unauthorized"},401);
    return saveStaffApplication(request,env,staff,pathname.endsWith("/admission")?"admission":"scholarship");
  }
  if(pathname==="/api/admin/staff/bridge-status" && request.method==="GET") {
    if(!isAdmin) return json({error:"Admin required"},403);
    // Report only boolean readiness; never expose Google Apps Script URL or the secret.
    return json({
      configured:driveReady(env),
      urlConfigured:!!env.STAFF_SHEETS_URL,
      secretConfigured:!!env.STAFF_SHEETS_SECRET,
      status:driveReady(env)?"configured":"missing_binding"
    });
  }
  // Non-mutating Apps Script authentication probe: no student data or file writes.
  if(pathname==="/api/admin/staff/bridge-probe" && request.method==="GET") {
    if(!isAdmin) return json({error:"Admin required"},403);
    return json(await probeDriveBridge(env));
  }
  // One-click read/write health test. Apps Script writes and trashes a tiny
  // temporary marker only; no student files or course logo rows are changed.
  if(pathname==="/api/admin/staff/bridge-drive-test" && post) {
    if(!isAdmin) return json({error:"Admin required"},403);
    if(!driveReady(env)) return json({
      success:false,code:"MISSING_CONFIG",
      message:"Google Apps Script URL or Secret missing from this Preview."
    });
    try {
      const result=await driveRequest(env,{action:"verifyDrive"});
      if(result.driveRead===true && result.driveWrite===true) return json({
        success:true,code:"DRIVE_READ_WRITE_OK",
        message:"Google Drive private folder read and file upload/delete test succeeded."
      });
      return json({
        success:false,code:"INCOMPLETE_TEST",
        message:"Apps Script did not confirm both Drive read and write permissions."
      });
    }catch(e) {
      const reason=e instanceof Error?e.message:"";
      console.error("Staff Portal Google Drive write verification failed",reason);
      if(/unsupported operation/i.test(reason))return json({
        success:false,code:"OLD_SCRIPT_VERSION",
        message:"Updated Apps Script must be deployed as a NEW VERSION of the existing Web App."
      });
      if(/unauthorized/i.test(reason))return json({
        success:false,code:"SECRET_MISMATCH",
        message:"Apps Script Script Property and Preview Secret do not match."
      });
      if(/authorization|permission|scope|access denied|not authorized/i.test(reason))return json({
        success:false,code:"DRIVE_PERMISSION",
        message:"Web App cannot write to Drive. Verify Execute as: Me, reauthorize Drive write in the editor, and redeploy."
      });
      if(/folder|file not found|does not exist/i.test(reason))return json({
        success:false,code:"DRIVE_FOLDER",
        message:"The Drive folder is missing or unavailable to the Web App execution account."
      });
      if(/quota|storage|limit exceeded/i.test(reason))return json({
        success:false,code:"DRIVE_QUOTA",
        message:"Google Drive or Apps Script storage quota may be exhausted."
      });
      return json({
        success:false,code:"SCRIPT_OR_NETWORK_ERROR",
        message:"Apps Script upload verification failed. Check its Web App execution details."
      });
    }
  }
  if(pathname==="/api/admin/staff/pdf-smoke-test" && post){
    if(!isAdmin)return json({error:"Admin required"},403);
    // Only temporary preview checks; never exercise PDF testing in production.
    if(env.STAFF_SUBMISSIONS_ENABLED!=="false")return json({
      success:false,code:"STAGING_ONLY",
      message:"PDF smoke tests are only allowed in isolated Preview with submissions disabled."
    },403);
    if(!driveReady(env))return json({
      success:false,code:"MISSING_CONFIG",message:"Google Drive Bridge is unavailable."
    });
    const logo=await env.DB.prepare(
      "SELECT extra_logo_drive_id,extra_logo_active FROM staff_courses WHERE course_id='ecce'"
    ).first<{extra_logo_drive_id:string|null;extra_logo_active:number}>();
    if(!logo?.extra_logo_drive_id || logo.extra_logo_active!==1)return json({
      success:false,code:"LOGO_REQUIRED",message:"Activate the ECCE extra logo before PDF test."
    });
    try{
      const result=await driveRequest(env,{action:"verifyPdf",courseLogoFileId:logo.extra_logo_drive_id});
      const tests=Array.isArray(result.tests)?result.tests:[];
      if(result.code!=="PDF_GENERATION_OK" || tests.length!==2 || !tests.every(
         (t:any)=>t&&t.validPdf===true&&Number(t.bytes)>500
      ))return json({
        success:false,code:"INCOMPLETE_PDF_TEST",
        message:"Apps Script did not confirm both Admission and Scholarship test PDFs."
      });
      return json({
        success:true,code:"PDF_GENERATION_OK",
        tests:tests.map((t:any)=>({type:t.type,bytes:Number(t.bytes)})),
        message:"Both synthetic PDFs generated. Temporary test PDF files were sent to Trash. No student data was submitted."
      });
    }catch(e){
      const reason=e instanceof Error?e.message:"";
      console.error("Staff Portal synthetic PDF verification failed",reason);
      let code="PDF_TEST_FAILED";
      let message="Could not generate test PDFs. Check Apps Script Executions for the exact reason.";
      if(/unsupported operation/i.test(reason)){
        code="SCRIPT_UPDATE_REQUIRED";message="Deploy the updated Apps Script as a new version of the existing Web App.";
      }else if(/permission|authorization|scope|not authorized/i.test(reason)){
        code="DOCUMENTS_PERMISSION";message="Authorize Google Docs and Drive permissions in the Apps Script Editor.";
      }else if(/not found|does not exist|logo|folder/i.test(reason)){
        code="PDF_ASSET_ERROR";message="Academy logo, ECCE logo, or a private PDF folder cannot be accessed.";
      }
      return json({success:false,code,message});
    }
  }
  if(pathname==="/api/admin/staff/course-logo" && ["POST","GET","DELETE"].includes(request.method)) {
    if(!isAdmin) return json({error:"Admin required"},403);
    return handleCourseLogo(request,env);
  }
  if(pathname==="/api/admin/staff/course-logo-status" && post) {
    if(!isAdmin) return json({error:"Admin required"},403);
    return setCourseLogoStatus(request,env);
  }
  // PDF bytes are streamed through authenticated Worker, never public Drive links.
  if(pathname.startsWith("/api/staff/pdf/") && request.method==="GET"){
    const staff=await session(request,env);
    if(!staff) return json({error:"Unauthorized"},401);
    const id=pathname.slice("/api/staff/pdf/".length);
    if(!/^[0-9a-f-]{36}$/i.test(id))return json({error:"Invalid PDF ID"},400);
    const row=await env.DB.prepare(
      "SELECT staff_id,kind,form_number,pdf_drive_id FROM student_applications WHERE id=?"
    ).bind(id).first<{staff_id:string;kind:string;form_number:string;pdf_drive_id:string|null}>();
    if(!row || row.staff_id!==staff.id)return json({error:"Application not found"},404);
    if(!row.pdf_drive_id)return json({error:"PDF is not generated yet"},404);
    try{
      const response=await driveRequest(env,{action:"getPdf",type:row.kind,fileId:row.pdf_drive_id});
      const bytes=fromBase64(String(response.base64||""));
      const filename="Nitya-Academy-"+row.form_number.replace(/[^a-zA-Z0-9_-]/g,"")+".pdf";
      return new Response(bytes,{headers:{
        "Content-Type":"application/pdf",
        "Content-Disposition":'attachment; filename="'+filename+'"',
        "Cache-Control":"private, no-store",
        "X-Content-Type-Options":"nosniff",
      }});
    }catch(e){console.error("PDF download failed",e);return json({error:"Unable to download PDF; contact Admin"},503);}
  }
  if(pathname==="/api/admin/staff/create" && post) {
    if(!isAdmin) return json({error:"Admin required"},403);
    const {id,name,password}=await credentials(request)||{};
    if(typeof id!=="string"||!/^NA-STF-[0-9]{3,8}$/.test(id)||
       typeof name!=="string"||name.trim().length<2||name.length>100||
       typeof password!=="string"||password.length<12||password.length>128) return json({error:"Invalid staff details. Password must be 12+ characters."},400);
    // Only report duplicate ID for an actual matching record. A crypto / D1
    // failure must never be mislabeled as a duplicate.
    try {
      const alreadyExists=await env.DB.prepare("SELECT id FROM staff WHERE id=? OR username=? LIMIT 1").bind(id,id).first();
      if(alreadyExists) return json({error:"Staff ID already exists"},409);
    } catch(error) {
      console.error("Staff existence lookup failed",error);
      return json({error:"Staff database unavailable. Please retry shortly."},503);
    }
    let hashedPassword:string;
    try {
      hashedPassword=await passwordHash(password);
    } catch(error) {
      console.error("Staff password hashing failed",error);
      return json({error:"Staff password encryption failed. Please contact admin."},503);
    }
    try {
      const saved=await env.DB.prepare("INSERT INTO staff(id,username,full_name,password_hash) VALUES (?,?,?,?)")
        .bind(id,id,name.trim(),hashedPassword).run();
      if(!saved.success || saved.meta.changes!==1)
        throw new Error("Staff insert did not modify exactly one row");
      return json({success:true,id},201);
    } catch(error) {
      console.error("Staff insert failed",error);
      // SQLite's UNIQUE constraint failure can be reported as a duplicate.
      const reason=String(error);
      if(/UNIQUE constraint failed/i.test(reason))
        return json({error:"Staff ID already exists"},409);
      return json({error:"Unable to save Staff Account. Please contact admin."},503);
    }
  }
  if(pathname==="/api/admin/staff/list" && request.method==="GET") {
    if(!isAdmin) return json({error:"Admin required"},403);
    const staff=await env.DB.prepare("SELECT id,full_name AS name,active,created_at,last_login_at FROM staff ORDER BY created_at DESC").all();
    return json({staff:staff.results});
  }
  if(pathname==="/api/admin/staff/status" && post) {
    if(!isAdmin) return json({error:"Admin required"},403);
    const {id,active}=await credentials(request)||{};
    if(typeof id!=="string"||typeof active!=="boolean") return json({error:"Invalid request"},400);
    const changed=await env.DB.prepare("UPDATE staff SET active=? WHERE id=?").bind(active?1:0,id).run();
    if(!active) await env.DB.prepare("UPDATE staff_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE staff_id=?").bind(id).run();
    return json({success:true,updated:changed.meta.changes});
  }
  if(pathname==="/api/admin/staff/courses" && request.method==="GET") {
    if(!isAdmin) return json({error:"Admin required"},403);
    return json({courses:await listStaffCourses(env)});
  }
  if(pathname==="/api/admin/staff/course-status" && post) {
    if(!isAdmin) return json({error:"Admin required"},403);
    const body=await credentials(request)||{};
    const {id,active}=body;
    if(typeof id!=="string" || typeof active!=="boolean" || id.length>80)
      return json({error:"Invalid course selection"},400);
    const course=(await listStaffCourses(env)).find(c=>c.id===id);
    if(!course) return json({error:"Course not found in website catalog"},404);
    await env.DB.prepare(`INSERT INTO staff_courses(course_id,course_name,active)
      VALUES (?,?,?) ON CONFLICT(course_id) DO UPDATE SET
      course_name=excluded.course_name,active=excluded.active`).bind(id,course.name,active?1:0).run();
    return json({success:true,id,active});
  }
  if(pathname==="/api/admin/staff/registration-series" && request.method==="GET") {
    if(!isAdmin) return json({error:"Admin required"},403);
    const series=await env.DB.prepare("SELECT sequence_key,prefix,next_number,end_number FROM registration_sequences WHERE sequence_key='scholarship'").first();
    return json({series:series||null});
  }
  if(pathname==="/api/admin/staff/registration-series" && post) {
    if(!isAdmin) return json({error:"Admin required"},403);
    const body=await credentials(request)||{};
    const {prefix,start,end}=body;
    if(typeof prefix!=="string"||!/[A-Za-z]/.test(prefix)&&prefix!==""||! /^[A-Za-z0-9-]{0,20}$/.test(prefix)
      ||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<1||end<start||end>999999999)
      return json({error:"Invalid registration number range"},400);
    const prior=await env.DB.prepare("SELECT next_number FROM registration_sequences WHERE sequence_key='scholarship'").first<{next_number:number}>();
    if(prior && start<prior.next_number) return json({error:"Start cannot be lower than the next unused number"},409);
    const existing=await env.DB.prepare("SELECT COUNT(*) AS n FROM student_applications WHERE kind='scholarship' AND form_number LIKE ?").bind(prefix+"%").first<{n:number}>();
    if(existing && existing.n>0 && prior && start!==prior.next_number)
      return json({error:"Registration series already used; change next number only after audit"},409);
    await env.DB.prepare("INSERT INTO registration_sequences(sequence_key,prefix,next_number,end_number) VALUES ('scholarship',?,?,?) ON CONFLICT(sequence_key) DO UPDATE SET prefix=excluded.prefix,next_number=excluded.next_number,end_number=excluded.end_number").bind(prefix,start,end).run();
    return json({success:true});
  }
  if(pathname==="/api/admin/staff/sync-sheets" && post) {
    if(!isAdmin) return json({error:"Admin required"},403);
    return json(await syncApplications(env));
  }
  return json({error:"Not implemented"},501);
}
