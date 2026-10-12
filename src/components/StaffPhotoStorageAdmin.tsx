import { useCallback, useEffect, useState } from "react";
import { Camera, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";

type Health={configured:boolean;enabled:boolean;note:string};
async function api(path:string,method:"GET"|"POST"="GET"){
 const response=await fetch(path,{
  method,credentials:"include",cache:"no-store",
  ...(method==="POST"?{headers:{"Content-Type":"application/json"},body:"{}"}:{})
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||"Private photo storage check failed");
 return data;
}
export default function StaffPhotoStorageAdmin(){
 const [health,setHealth]=useState<Health|null>(null);
 const [busy,setBusy]=useState("");
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const refresh=useCallback(async()=>{
  setBusy("refresh");setError("");
  try{setHealth(await api("/api/admin/staff/photo-ready"));}
  catch(e){setError(e instanceof Error?e.message:"Could not check photo storage");}
  finally{setBusy("");}
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 const test=async()=>{
  setBusy("test");setMessage("");setError("");
  try{
   const r=await api("/api/admin/staff/photo-smoke-test","POST");
   if(r.success&&r.code==="STUDENT_PHOTO_V3_READY")
    setMessage("Success: V3 Apps Script uploaded and then trashed a synthetic image in the private Admission Photos folder.");
   else throw Error("Unexpected response from photo test");
  }catch(e){setError(e instanceof Error?e.message:"Photo storage test failed");}
  finally{setBusy("");}
 };
 const cleanup=async()=>{
  if(!window.confirm("Remove up to 20 expired private Student Photo drafts? Photos still within their active 48-hour window will NOT be touched."))return;
  setBusy("cleanup");setMessage("");setError("");
  try{
   const r=await api("/api/admin/staff/photo-cleanup","POST");
   setMessage("Cleanup complete: "+r.cleaned+" database drafts and "+(r.orphaned||0)+" expired Drive draft files cleaned.");
  }catch(e){setError(e instanceof Error?e.message:"Cleanup failed");}
  finally{setBusy("");}
 };
 return <section className="rounded-2xl bg-white border p-5 sm:p-6 space-y-4">
  <div className="flex gap-3 items-center justify-between flex-wrap">
   <div>
    <h3 className="text-lg font-bold flex gap-2 items-center"><Camera size={20}/> Student Photo Storage</h3>
    <p className="text-sm text-slate-600 mt-1">
     Admission and Scholarship photos will be saved separately in PRIVATE Google Drive folders.
     No photo is public, and final student application submission remains disabled.
    </p>
   </div>
   <button type="button" disabled={!!busy} onClick={()=>void refresh()}
    className="border px-3 py-2 rounded-lg text-sm inline-flex gap-2 items-center disabled:opacity-40">
    <RefreshCw size={16}/> Refresh
   </button>
  </div>
  {health&&<div className="rounded-lg border bg-slate-50 p-3 text-sm space-y-1">
   <p>Google Drive configured: <strong>{health.configured?"Yes":"No"}</strong></p>
   <p>Staff Photo Upload: <strong>{health.enabled?"Enabled":"Not activated (safe mode)"}</strong></p>
   <p className="text-xs text-slate-600">
    {health.enabled
     ?"Private draft storage is activated, but Final Admission/Scholarship Submit is still disabled."
     :"To activate after testing: Cloudflare Worker → Settings → Production or Preview → STAFF_PHOTO_UPLOADS_ENABLED = true. Do not activate before V3 bridge test and D1 migration."}
   </p>
  </div>}
  <div className="flex gap-3 flex-wrap">
   <button type="button" disabled={!!busy||!health?.configured} onClick={()=>void test()}
    className="border rounded-lg px-3 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-40">
    <ShieldCheck size={16}/>{busy==="test"?"Testing...":"Test Private Photo Drive (no real student)"}
   </button>
   <button type="button" disabled={!!busy||!health?.enabled} onClick={()=>void cleanup()}
    className="border rounded-lg px-3 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-40">
    <Trash2 size={16}/> Cleanup Expired Drafts
   </button>
  </div>
  {message&&<p role="status" className="rounded-lg bg-green-50 border border-green-200 text-green-800 p-3 text-sm">{message}</p>}
  {error&&<p role="alert" className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</p>}
  <p className="text-xs text-slate-600">Smoke test creates and immediately trashes one small synthetic image; no student data is sent. Draft photos expire after 48 hours and can be removed manually.</p>
 </section>;
}
