// Phase 5 - server-only Apps Script bridge. Never expose secret in frontend.
export type SyncEnv={DB:D1Database; STAFF_SHEETS_URL?:string; STAFF_SHEETS_SECRET?:string};
export async function syncApplications(env:SyncEnv,limit=20) {
 if(!env.STAFF_SHEETS_URL||!env.STAFF_SHEETS_SECRET) return {configured:false,synced:0,failed:0};
 const url=new URL(env.STAFF_SHEETS_URL);
 if(url.protocol!=="https:" || !["script.google.com","script.googleusercontent.com"].includes(url.hostname)) throw new Error("Invalid Apps Script URL");
 const records=await env.DB.prepare("SELECT a.id,a.kind,a.form_number,a.student_name,a.mobile,a.fields_json,a.created_at,a.staff_id,s.full_name AS staff_name FROM student_applications a JOIN staff s ON s.id=a.staff_id WHERE a.sheet_sync_status IN ('pending','failed') ORDER BY a.created_at LIMIT ?").bind(Math.min(Math.max(limit,1),50)).all<any>();
 let synced=0,failed=0;
 for(const row of records.results){
  try {
   const payload={action:"upsert",recordId:row.id,type:row.kind,formNumber:row.form_number,createdAt:row.created_at,studentName:row.student_name,mobile:row.mobile,staffId:row.staff_id,staffName:row.staff_name,fields:JSON.parse(row.fields_json)};
   const response=await fetch(url.toString(),{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({secret:env.STAFF_SHEETS_SECRET,...payload}),redirect:"follow",signal:AbortSignal.timeout(15000)});
   if(!response.ok) throw new Error("Sheet HTTP "+response.status);
   const result=await response.json() as {success?:boolean;error?:string};
   if(result.success!==true)throw new Error(result.error||"Sheet rejected record");
   await env.DB.prepare("UPDATE student_applications SET sheet_sync_status='synced',sheet_last_error=NULL WHERE id=?").bind(row.id).run();synced++;
  }catch(e){failed++;await env.DB.prepare("UPDATE student_applications SET sheet_sync_status='failed',sheet_last_error=? WHERE id=?").bind(String(e).slice(0,300),row.id).run();}
 }
 return {configured:true,synced,failed,checked:records.results.length};
}
