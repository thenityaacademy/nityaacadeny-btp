import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, MessageCircle, FileClock } from "lucide-react";

type Application={
 id:string;kind:"admission"|"scholarship";form_number:string;student_name:string;mobile:string;
 document_status:string;sheet_sync_status:string;pdf_drive_id:string|null;created_at:string;
};
const api=async(path:string,init?:RequestInit)=>{
 const response=await fetch(path,{credentials:"include",cache:"no-store",...init});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||"Could not load your registered forms.");
 return data;
};
/**
 * Staff-owned receipts remain available after closing the form/tab.
 * Only the logged-in Staff member's rows are exposed by the server.
 * No Aadhaar or private Google Drive file IDs are disclosed in this UI.
 */
export default function StaffApplicationsHistory(){
 const [rows,setRows]=useState<Application[]>([]);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const reload=useCallback(async()=>{
  setBusy("load");setError("");
  try{
   const data=await api("/api/staff/applications");
   setRows(Array.isArray(data.applications)?data.applications:[]);
  }catch(e){setError(e instanceof Error?e.message:"Could not check submitted applications.");}
  finally{setBusy("");}
 },[]);
 useEffect(()=>{void reload();},[reload]);
 const retry=async(row:Application)=>{
  if(busy)return;
  setBusy(row.id);setError("");setNotice("");
  try{
   const data=await api("/api/staff/application/retry",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({recordId:row.id})
   });
   setNotice(data.sheetStatus==="synced"&&data.pdfReady
    ? row.form_number+" — PDF and Google Sheet are ready."
    : row.form_number+" — retry completed; check statuses and retry later if necessary.");
   const result=await api("/api/staff/applications");
   setRows(Array.isArray(result.applications)?result.applications:[]);
  }catch(e){setError(e instanceof Error?e.message:"Could not retry this application.");}
  finally{setBusy("");}
 };
 const whatsapp=(row:Application)=>{
  // Phone is only used locally for preparing the confirmation; nothing is sent automatically.
  const number=(row.mobile||"").replace(/\D/g,"");
  const message="Dear "+row.student_name+",\n\nYour "+
   (row.kind==="admission"?"admission application":"ECCE Scholarship registration")+
   " has been recorded with *Nitya Academy, Bharatpur*.\n"+
   "*Student Name:* "+row.student_name+"\n"+
   (row.kind==="admission"?"*Application Number:* ":"*Registration Number:* ")+row.form_number+
   "\n\nPlease keep your form number and PDF for future reference. "+
   "This acknowledgement does not confirm final admission, scholarship selection or payment.\n\n"+
   "*NITYA ACADEMY, BHARATPUR*\nNear Ketan Gate, Sahyog Nagar, Bharatpur 321001"+
   "\nContact: +91 9680008384 | +91 9802813444";
  window.open("https://wa.me/"+(/^[6-9]\d{9}$/.test(number)?"91"+number:"")+
   "?text="+encodeURIComponent(message),"_blank","noopener,noreferrer");
 };
 return <section className="rounded-2xl border bg-white p-4 sm:p-6 space-y-4" aria-label="My submitted forms">
  <div className="flex flex-wrap justify-between items-center gap-3">
   <div>
    <h3 className="font-bold text-lg flex items-center gap-2"><FileClock size={20}/>My Submitted Forms</h3>
    <p className="text-sm text-slate-600">Recover PDF files and retry Google Sheet syncing even if the original form was closed.</p>
   </div>
   <button type="button" onClick={()=>void reload()} disabled={!!busy} className="border rounded-lg px-3 py-2 text-sm inline-flex gap-2 items-center disabled:opacity-50">
    <RefreshCw size={15}/>{busy==="load"?"Loading...":"Refresh"}
   </button>
  </div>
  {error&&<p role="alert" className="text-sm text-red-800 bg-red-50 rounded-lg p-3">{error}</p>}
  {notice&&<p role="status" className="text-sm text-green-900 bg-green-50 rounded-lg p-3">{notice}</p>}
  {rows.length===0&&!busy&&<p className="text-sm text-slate-600">No submitted forms yet. Admission and Scholarship Forms are available above.</p>}
  {rows.map(row=><article key={row.id} className="border rounded-xl p-3 sm:p-4 space-y-2">
   <div className="flex flex-wrap items-center justify-between gap-2">
    <div>
     <p className="font-bold text-slate-900">{row.form_number}</p>
     <p className="text-sm text-slate-600">{row.kind==="admission"?"Admission":"ECCE Scholarship"} · {row.student_name}</p>
    </div>
    <div className="text-sm space-y-1">
     <p>PDF: <strong>{row.document_status==="ready"&&row.pdf_drive_id?"Ready":"Pending"}</strong></p>
     <p>Google Sheet: <strong>{row.sheet_sync_status==="synced"?"Synced":"Pending / Retry Required"}</strong></p>
    </div>
   </div>
   <div className="flex gap-2 flex-wrap">
    {row.document_status==="ready"&&row.pdf_drive_id&&<a href={"/api/staff/pdf/"+encodeURIComponent(row.id)}
      className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm">
      <Download size={16}/>Download PDF</a>}
    {(row.sheet_sync_status!=="synced"||row.document_status!=="ready")&&<button type="button"
      disabled={!!busy} onClick={()=>void retry(row)}
      className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm disabled:opacity-50">
      <RefreshCw size={16}/>{busy===row.id?"Retrying...":"Retry PDF / Google Sheet"}
    </button>}
    {row.document_status==="ready"&&row.pdf_drive_id&&<button type="button"
      className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm" onClick={()=>whatsapp(row)}>
      <MessageCircle size={16}/>Prepare English WhatsApp Message
    </button>}
   </div>
   <p className="text-xs text-slate-500">WhatsApp does not send automatically. Download and attach the PDF if your device cannot share it as a file.</p>
  </article>)}
  <p className="text-xs text-slate-500">Only the latest 60 forms created by your own Staff login are displayed.</p>
 </section>;
}
