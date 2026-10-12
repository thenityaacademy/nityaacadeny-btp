/**
 * Phase 2 ONLY: Staff authentication and Admin-issued Staff accounts.
 * Absolutely no Staff Admission, Scholarship, PDF, Sheet sync, or Drive writes.
 * Routes are allowlisted here; everything else under /api/staff/ or
 * /api/admin/staff/ must be denied (never fall through to asset handling).
 * The existing site's HMAC-signed admin session supplies isAdmin.
 */
type Env = {DB:D1Database};
type StaffRow = {id:string;full_name:string;password_hash:string;active:number};
const COOKIE="nitya_staff_session";
const SESSION_MS=8*60*60*1000;
const WINDOW_MS=15*60*1000;
const MAX_STAFF_ATTEMPTS=8;
const MAX_IP_ATTEMPTS=40;
const enc=new TextEncoder();
function out(body:unknown,status=200,headers:Record<string,string>={}) {
  return Response.json(body,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff",...headers}});
}
const toHex=(b:ArrayBuffer|Uint8Array)=>Array.from(b instanceof Uint8Array?b:new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");
const digest=async(s:string)=>toHex(await crypto.subtle.digest("SHA-256",enc.encode(s)));
function randomToken(){return toHex(crypto.getRandomValues(new Uint8Array(32)));}
function safeCompare(a:string,b:string){
  if(a.length!==b.length)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
async function hashPassword(password:string,salt=randomToken()){
  const material=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:enc.encode(salt),iterations:100000,hash:"SHA-256"},material,256);
  return "pbkdf2-sha256$100000$"+salt+"$"+toHex(bits);
}
async function verifyPassword(password:string,stored:string){
  const p=stored.split("$");
  if(p.length!==4||p[0]!=="pbkdf2-sha256"||p[1]!=="100000"||!/^[0-9a-f]{64}$/.test(p[2])||!/^[0-9a-f]{64}$/.test(p[3]))return false;
  const attempt=await hashPassword(password,p[2]);
  return safeCompare(attempt,stored);
}
function getCookie(request:Request){
  return request.headers.get("Cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="))?.slice(COOKIE.length+1)||"";
}
const expiredCookie=COOKIE+"=; Path=/api/staff; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
function validOrigin(request:Request){
  const origin=request.headers.get("Origin");
  return origin===new URL(request.url).origin;
}
async function parseJson(request:Request):Promise<Record<string,unknown>|null>{
  if(request.headers.get("Content-Type")?.split(";")[0]!=="application/json")return null;
  const contentLength=Number(request.headers.get("Content-Length")||0);
  if(contentLength>3000)return null;
  const value=await request.json().catch(()=>null);
  return value&&typeof value==="object"&&!Array.isArray(value)?value:null;
}
async function getStaffSession(request:Request,env:Env){
  const token=getCookie(request);
  if(!/^[0-9a-f]{64}$/.test(token))return null;
  return env.DB.prepare(
    "SELECT s.id,s.full_name AS name FROM staff_sessions AS x JOIN staff AS s ON s.id=x.staff_id "+
    "WHERE x.token_hash=? AND x.revoked_at IS NULL AND x.expires_at>? AND s.active=1"
  ).bind(await digest(token),new Date().toISOString()).first<{id:string;name:string}>();
}
async function attemptKey(kind:"ip"|"staff",value:string){return kind+":"+await digest(value);}
async function blocked(env:Env,key:string,max:number,now:number){
  const row=await env.DB.prepare(
    "SELECT attempts,window_start_ms FROM staff_login_attempts WHERE attempt_key=?"
  ).bind(key).first<{attempts:number;window_start_ms:number}>();
  return Boolean(row&&now-row.window_start_ms<WINDOW_MS&&row.attempts>=max);
}
async function countFailure(env:Env,key:string,now:number){
  await env.DB.prepare(
    "INSERT INTO staff_login_attempts(attempt_key,window_start_ms,attempts) VALUES (?,?,1) "+
    "ON CONFLICT(attempt_key) DO UPDATE SET "+
    "window_start_ms=CASE WHEN excluded.window_start_ms-staff_login_attempts.window_start_ms>=? "+
    "THEN excluded.window_start_ms ELSE staff_login_attempts.window_start_ms END, "+
    "attempts=CASE WHEN excluded.window_start_ms-staff_login_attempts.window_start_ms>=? "+
    "THEN 1 ELSE staff_login_attempts.attempts+1 END"
  ).bind(key,now,WINDOW_MS,WINDOW_MS).run();
}
async function revokeSessions(env:Env,id:string) {
  return env.DB.prepare("UPDATE staff_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE staff_id=? AND revoked_at IS NULL").bind(id).run();
}
export async function handlePhaseTwo(request:Request,env:Env,isAdmin:boolean):Promise<Response|null>{
  const path=new URL(request.url).pathname;
  if(!path.startsWith("/api/staff/")&&!path.startsWith("/api/admin/staff/"))return null;
  const post=request.method==="POST";
  if(post&&!validOrigin(request))return out({error:"Invalid request origin"},403);

  if(path==="/api/staff/login"&&post){
    const data=await parseJson(request);
    const id=typeof data?.staffId==="string"?data.staffId.trim().toUpperCase():"";
    const password=typeof data?.password==="string"?data.password:"";
    if(!/^NA-STF-[0-9]{3,8}$/.test(id)||password.length<1||password.length>128)
      return out({error:"Invalid Staff ID or password"},401);
    const now=Date.now();
    const ip=request.headers.get("CF-Connecting-IP")||"unavailable";
    const [idKey,ipKey]=await Promise.all([attemptKey("staff",id),attemptKey("ip",ip)]);
    if((await blocked(env,idKey,MAX_STAFF_ATTEMPTS,now))||
       (await blocked(env,ipKey,MAX_IP_ATTEMPTS,now)))
      return out({error:"Too many login attempts. Try again after 15 minutes."},429);
    const staff=await env.DB.prepare(
      "SELECT id,full_name,password_hash,active FROM staff WHERE id=?"
    ).bind(id).first<StaffRow>();
    // Run PBKDF2 for missing accounts too, reducing timing-based enumeration.
    const matches=staff?await verifyPassword(password,staff.password_hash):
      Boolean(await hashPassword(password,"0000000000000000000000000000000000000000000000000000000000000000"))&&false;
    if(!staff||staff.active!==1||!matches){
      await Promise.all([countFailure(env,idKey,now),countFailure(env,ipKey,now)]);
      return out({error:"Invalid Staff ID or password"},401);
    }
    const token=randomToken();
    const hash=await digest(token);
    // Recheck enabled status before issuing a usable session.
    const fresh=await env.DB.prepare("SELECT active FROM staff WHERE id=?").bind(id).first<{active:number}>();
    if(fresh?.active!==1)return out({error:"Account disabled. Contact Admin."},403);
    await env.DB.batch([
      env.DB.prepare("INSERT INTO staff_sessions(token_hash,staff_id,expires_at) VALUES (?,?,?)")
        .bind(hash,id,new Date(now+SESSION_MS).toISOString()),
      env.DB.prepare("UPDATE staff SET last_login_at=CURRENT_TIMESTAMP WHERE id=?").bind(id),
      env.DB.prepare("DELETE FROM staff_login_attempts WHERE attempt_key=?").bind(idKey)
    ]);
    return out({success:true},200,{"Set-Cookie":COOKIE+"="+token+
      "; Path=/api/staff; HttpOnly; Secure; SameSite=Strict; Max-Age=28800"});
  }

  if(path==="/api/staff/session"&&request.method==="GET"){
    const staff=await getStaffSession(request,env);
    return out(staff?{authenticated:true,staff}:{authenticated:false});
  }
  if(path==="/api/staff/logout"&&post){
    const token=getCookie(request);
    if(/^[0-9a-f]{64}$/.test(token)){
      await env.DB.prepare("UPDATE staff_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE token_hash=?")
        .bind(await digest(token)).run();
    }
    return out({success:true},200,{"Set-Cookie":expiredCookie});
  }
  if(path==="/api/staff/dashboard"&&request.method==="GET"){
    const staff=await getStaffSession(request,env);
    if(!staff)return out({error:"Staff login required"},401);
    const records=await env.DB.prepare(
      "SELECT kind,COUNT(*) AS n FROM student_applications WHERE staff_id=? GROUP BY kind"
    ).bind(staff.id).all<{kind:string;n:number}>();
    const total=(kind:string)=>records.results.find(r=>r.kind===kind)?.n||0;
    return out({staff,counts:{admissions:total("admission"),scholarships:total("scholarship")},
      features:{admissionsEnabled:false,scholarshipsEnabled:false,pdfEnabled:false},
      notice:"Admission, Scholarship and PDF features will be enabled after separate security and form tests."});
  }

  // All other staff endpoints fail closed. No form/Drive/Sheets routes in Phase 2.
  if(path.startsWith("/api/staff/"))return out({error:"This Staff Portal feature is not yet enabled."},503);

  if(!isAdmin)return out({error:"Admin authentication required"},403);
  if(path==="/api/admin/staff/phase2-overview"&&request.method==="GET"){
    const [accounts,applications,logos]=await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS n FROM staff").first<{n:number}>(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM student_applications").first<{n:number}>(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM staff_courses WHERE extra_logo_active=1").first<{n:number}>()
    ]);
    return out({phase:"phase2",status:"login_active",
      staffAccounts:Number(accounts?.n||0),
      staffApplications:Number(applications?.n||0),
      extraLogosActive:Number(logos?.n||0),
      staffLoginEnabled:true,
      staffSubmissionsEnabled:false,
      pdfEnabled:false,
      googleDriveProductionEnabled:false});
  }
  if(path==="/api/admin/staff/list"&&request.method==="GET"){
    const data=await env.DB.prepare(
      "SELECT id,full_name AS name,active,created_at,last_login_at FROM staff ORDER BY created_at DESC,id ASC"
    ).all();
    return out({staff:data.results});
  }
  if(path==="/api/admin/staff/create"&&post){
    const data=await parseJson(request);
    const id=typeof data?.id==="string"?data.id.trim().toUpperCase():"";
    const name=typeof data?.name==="string"?data.name.trim():"";
    const password=typeof data?.password==="string"?data.password:"";
    if(!/^NA-STF-[0-9]{3,8}$/.test(id)||name.length<2||name.length>100||
      password.length<12||password.length>128||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password))
      return out({error:"Enter Staff ID, full name and a strong 12+ character password with letters and numbers."},400);
    const exists=await env.DB.prepare("SELECT id FROM staff WHERE id=? OR username=?").bind(id,id).first();
    if(exists)return out({error:"Staff ID already exists"},409);
    const hash=await hashPassword(password);
    try{
      await env.DB.prepare("INSERT INTO staff(id,username,full_name,password_hash,active) VALUES (?,?,?,?,1)")
        .bind(id,id,name,hash).run();
      return out({success:true,id},201);
    }catch(e){
      if(/UNIQUE constraint failed/i.test(String(e)))return out({error:"Staff ID already exists"},409);
      console.error("Staff creation failed",e);
      return out({error:"Could not create Staff account"},503);
    }
  }
  if(path==="/api/admin/staff/status"&&post){
    const data=await parseJson(request);
    const id=typeof data?.id==="string"?data.id.trim():"";
    const active=data?.active;
    if(!/^NA-STF-[0-9]{3,8}$/.test(id)||typeof active!=="boolean")
      return out({error:"Invalid Staff account or status"},400);
    const exists=await env.DB.prepare("SELECT id FROM staff WHERE id=?").bind(id).first();
    if(!exists)return out({error:"Staff ID not found"},404);
    await env.DB.batch([
      env.DB.prepare("UPDATE staff SET active=? WHERE id=?").bind(active?1:0,id),
      ...(active?[]:[env.DB.prepare(
        "UPDATE staff_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE staff_id=? AND revoked_at IS NULL"
      ).bind(id)])
    ]);
    return out({success:true,id,active});
  }
  if(path==="/api/admin/staff/reset-password"&&post){
    const data=await parseJson(request);
    const id=typeof data?.id==="string"?data.id.trim():"";
    const password=typeof data?.password==="string"?data.password:"";
    if(!/^NA-STF-[0-9]{3,8}$/.test(id)||password.length<12||password.length>128||
       !/[A-Za-z]/.test(password)||!/[0-9]/.test(password))
      return out({error:"Use a strong 12+ character password containing letters and numbers."},400);
    const exists=await env.DB.prepare("SELECT id FROM staff WHERE id=?").bind(id).first();
    if(!exists)return out({error:"Staff ID not found"},404);
    const hash=await hashPassword(password);
    await env.DB.batch([
      env.DB.prepare("UPDATE staff SET password_hash=? WHERE id=?").bind(hash,id),
      env.DB.prepare("UPDATE staff_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE staff_id=? AND revoked_at IS NULL").bind(id)
    ]);
    return out({success:true,id,sessionRevoked:true});
  }
  // No release of scholarship settings or any other administrative write.
  return out({error:"This Admin feature is reserved for a later phase."},503);
}
