/**
 * Staff-only API handler for Cloudflare Workers.
 * Call handleStaffAuth(request, env, isAdmin) BEFORE the static asset fallback.
 * isAdmin must be derived from existing, verified server-side admin session.
 * Returns null for routes this module does not handle.
 */
const COOKIE = "nitya_staff_session";
const ttlMs = 8 * 60 * 60 * 1000;
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
  const hash = await crypto.subtle.deriveBits({ name:"PBKDF2",salt:encoder.encode(salt),iterations:210000,hash:"SHA-256" },material,256);
  return "pbkdf2-sha256$210000$" + salt + "$" + hex(hash);
}
async function verifyPassword(password: string, stored: string) {
  const parts=stored.split("$");
  if(parts.length!==4 || parts[0]!=="pbkdf2-sha256" || parts[1]!=="210000") return false;
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
type Env = { DB: D1Database };
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
      env.DB.prepare("SELECT course_id AS id,course_name AS name FROM staff_courses WHERE active=1 ORDER BY course_name").all<{id:string,name:string}>()
    ]);
    const settingsMap=Object.fromEntries(settings.results.map(s=>[s.setting_key,s.setting_value]));
    return json({enquiryUrl:settingsMap.enquiryUrl||"",admissionTerms:settingsMap.admissionTerms||"",scholarshipTerms:settingsMap.scholarshipTerms||"",courses:courses.results});
  }
  if(pathname==="/api/admin/staff/create" && post) {
    if(!isAdmin) return json({error:"Admin required"},403);
    const {id,name,password}=await credentials(request)||{};
    if(typeof id!=="string"||!/^NA-STF-[0-9]{3,8}$/.test(id)||
       typeof name!=="string"||name.trim().length<2||name.length>100||
       typeof password!=="string"||password.length<12||password.length>128) return json({error:"Invalid staff details. Password must be 12+ characters."},400);
    try {
      await env.DB.prepare("INSERT INTO staff(id,username,full_name,password_hash) VALUES (?,?,?,?)").bind(id,id,name.trim(),await passwordHash(password)).run();
      return json({success:true,id},201);
    } catch { return json({error:"Staff ID already exists"},409); }
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
  return json({error:"Not implemented"},501);
}
