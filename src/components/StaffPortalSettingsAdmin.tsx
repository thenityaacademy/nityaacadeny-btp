import StaffCourseSettings from "./StaffCourseSettings";
import {useEffect,useState,type FormEvent} from "react";
type Series={sequence_key:string;prefix:string;next_number:number;end_number:number};
async function api(path:string,init?:RequestInit){
 const r=await fetch(path,{credentials:"include",cache:"no-store",...init});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data.error||"Server request failed");
 return data;
}
export default function StaffPortalSettingsAdmin(){
 const [series,setSeries]=useState<Series|null>(null);
 const [prefix,setPrefix]=useState("");
 const [start,setStart]=useState("");
 const [end,setEnd]=useState("");
 const [busy,setBusy]=useState(false);
 const [status,setStatus]=useState("");
 const [error,setError]=useState("");
 useEffect(()=>{api("/api/admin/staff/registration-series").then(data=>{
  if(data.series){setSeries(data.series);setPrefix(data.series.prefix);setStart(String(data.series.next_number));setEnd(String(data.series.end_number));}
 }).catch(e=>setError(e.message));},[]);
 const save=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError("");setStatus("");
  try{await api("/api/admin/staff/registration-series",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prefix,start:Number(start),end:Number(end)})});setStatus("Registration series saved.");}
  catch(e){setError(e instanceof Error?e.message:"Failed to save");}finally{setBusy(false);}
 };
 const sync=async()=>{setBusy(true);setError("");setStatus("");try{const r=await api("/api/admin/staff/sync-sheets",{method:"POST"});setStatus(r.configured?`Sync complete: ${r.synced} saved, ${r.failed} failed.`:"Google Sheets integration is not configured yet.");}catch(e){setError(e instanceof Error?e.message:"Sync failed");}finally{setBusy(false);}};
 return <section className="space-y-6">
  <h2 className="text-2xl font-bold">Staff Portal Settings</h2>
  {error&&<p role="alert" className="bg-red-50 text-red-700 p-3 rounded-lg">{error}</p>}
  {status&&<p role="status" className="bg-green-50 text-green-800 p-3 rounded-lg">{status}</p>}
  <form onSubmit={save} className="bg-white rounded-2xl border p-6 space-y-4">
   <h3 className="text-lg font-semibold">ECCE Scholarship Registration Number</h3>
   <p className="text-sm text-slate-500">Example: Prefix NAECCE, start 2600001, end 2605000. Issued numbers must never be reused.</p>
   <div className="grid sm:grid-cols-3 gap-4">
    <label className="text-sm">Prefix<input className="block w-full border rounded-xl p-3 mt-1" maxLength={20} value={prefix} onChange={e=>setPrefix(e.target.value)}/></label>
    <label className="text-sm">Next Number<input required type="number" min={series?.next_number||1} className="block w-full border rounded-xl p-3 mt-1" value={start} onChange={e=>setStart(e.target.value)}/></label>
    <label className="text-sm">Last Number<input required type="number" min={1} className="block w-full border rounded-xl p-3 mt-1" value={end} onChange={e=>setEnd(e.target.value)}/></label>
   </div>
   <button disabled={busy} className="pill-btn-primary disabled:opacity-60">{busy?"Saving...":"Save Series"}</button>
  </form>
  <StaffCourseSettings />
  <div className="bg-white rounded-2xl border p-6 space-y-3">
   <h3 className="text-lg font-semibold">Google Sheets Sync</h3>
   <p className="text-sm text-slate-500">Existing Enquiry integration is separate. This sync handles Admissions and Scholarships.</p>
   <button type="button" disabled={busy} onClick={sync} className="pill-btn-primary disabled:opacity-60">Retry Pending/Failed Sync</button>
  </div>
 </section>;
}
