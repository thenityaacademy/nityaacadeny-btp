import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, MessageCircle, FileClock, Pencil, Archive, RotateCcw, X, Save } from "lucide-react";
import { downloadStaffPdf, fetchStaffPdfFile, canShareStaffPdf, sharePreparedStaffPdf } from "../lib/staffPdfDownload";

type Application={
 id:string;kind:"admission"|"scholarship";form_number:string;student_name:string;mobile:string;
 document_status:string;sheet_sync_status:string;pdf_drive_id:string|null;created_at:string;
 revision_number:number;revised_at:string|null;staff_hidden_at:string|null;
};
type Course={id:string;name:string;active:boolean};
type Detail={recordId:string;number:string;kind:"admission"|"scholarship";fields:Record<string,string>;revisionNumber:number;hidden:boolean};
const api=async(path:string,init?:RequestInit)=>{
 const response=await fetch(path,{credentials:"include",cache:"no-store",...init});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||"Could not manage this submitted form.");
 return data;
};
const post=(body:unknown):RequestInit=>({
 method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)
});
const labels:Record<string,string>={
 studentName:"Student Name",fatherName:"Father's Name",motherName:"Mother's Name",dob:"Date of Birth",
 gender:"Gender",aadhaar:"Aadhaar Number",mobile:"Mobile",whatsapp:"WhatsApp Number",email:"Email",
 address:"Full Address",city:"Village / City",district:"District",state:"State",pin:"PIN Code",
 passed10:"10th Passed?",board10:"10th Board",year10:"10th Passing Year",percent10:"10th Percentage",
 passed12:"12th Passed?",board12:"12th Board",year12:"12th Passing Year",percent12:"12th Percentage",
 lastQualification:"Last Qualification",lastBoard:"Last Board / University",lastYear:"Last Passing Year",
 lastPercent:"Last Qualification %",course:"Admission Course",session:"Session",
 totalFees:"Total Fees (₹)",practicalApplicable:"Practical Fees Applicable?",
 practicalFee:"Practical Fees (₹)",hasReference:"External Reference?",
 referenceName:"Reference Name",examDate:"Scholarship Exam Date",
 paymentMode:"₹100 Payment Method",transactionRef:"Transaction Reference"
};
const systemKeys=new Set(["courseName","registrationDate","registrationFee","termsAccepted"]);
const choice:Record<string,{value:string;label:string}[]>={
 gender:[{value:"male",label:"Male"},{value:"female",label:"Female"},{value:"other",label:"Other"},{value:"prefer-not-to-say",label:"Prefer not to say"}],
 passed10:[{value:"yes",label:"Yes"},{value:"no",label:"No"}],
 passed12:[{value:"yes",label:"Yes"},{value:"no",label:"No"}],
 practicalApplicable:[{value:"yes",label:"Yes"},{value:"no",label:"No"}],
 hasReference:[{value:"yes",label:"Yes"},{value:"no",label:"No"}],
 paymentMode:[{value:"cash",label:"Cash"},{value:"online",label:"Online"}]
};
const orderedKeys=Object.keys(labels);
const digits=new Set(["aadhaar","mobile","whatsapp","pin","year10","year12","lastYear"]);
const longFields=new Set(["address"]);

export default function StaffApplicationsHistory({kind,courses=[]}:{kind:"admission"|"scholarship";courses?:Course[]}){
 const [rows,setRows]=useState<Application[]>([]);
 const [removed,setRemoved]=useState(false);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [editing,setEditing]=useState<Detail|null>(null);
 const [editFields,setEditFields]=useState<Record<string,string>>({});
 const [preparedShare,setPreparedShare]=useState<{id:string,file:File}|null>(null);
 const reload=useCallback(async()=>{
  setBusy("load");setError("");
  try{
   const data=await api("/api/staff/applications?kind="+kind+(removed?"&removed=1":""));
   setRows(Array.isArray(data.applications)?data.applications:[]);
  }catch(e){setError(e instanceof Error?e.message:"Could not check submitted applications.");}
  finally{setBusy("");}
 },[removed,kind]);
 useEffect(()=>{void reload();},[reload]);
 const retry=async(row:Application)=>{
  if(busy)return;
  setBusy(row.id);setError("");setNotice("");
  try{
   const data=await api("/api/staff/application/retry",post({recordId:row.id}));
   setNotice(data.sheetStatus==="synced"&&data.pdfReady
    ?row.form_number+" — Updated PDF and Google Sheet are ready."
    :row.form_number+" — retry completed; check both statuses again.");
   await reload();
  }catch(e){setError(e instanceof Error?e.message:"Could not retry this application.");}
  finally{setBusy("");}
 };
 const downloadPdf=async(row:Application)=>{
  if(busy)return;
  setBusy(row.id+"-pdf");setError("");
  try{await downloadStaffPdf(row.id,row.form_number);}
  catch(e){setError(e instanceof Error?e.message:"Could not download PDF.");}
  finally{setBusy("");}
 };
 const openEditor=async(row:Application)=>{
  if(busy)return;
  setBusy(row.id+"-edit");setError("");setNotice("");
  try{
   const data=await api("/api/staff/application/details",post({recordId:row.id})) as Detail;
   if(data.hidden)throw Error("Restore this removed form before editing.");
   setEditing(data);setEditFields({...data.fields});
  }catch(e){setError(e instanceof Error?e.message:"Could not load this form.");}
  finally{setBusy("");}
 };
 const saveEdit=async()=>{
  if(!editing||busy)return;
  const changes:Record<string,string>={};
  for(const [key,value] of Object.entries(editFields))
   if(!systemKeys.has(key)&&(editing.fields[key]||"")!==value)changes[key]=value;
  if(Object.keys(changes).length===0){setEditing(null);setNotice("No fields changed.");return;}
  if(!window.confirm("Save corrections to "+editing.number+"? The number stays unchanged. Its PDF and Sheet entry will be updated or marked for retry."))return;
  setBusy("save-edit");setNotice("");setError("");
  try{
   const result=await api("/api/staff/application/update",post({
    recordId:editing.recordId,revisionNumber:editing.revisionNumber,changes
   }));
   setEditing(null);
   setNotice(result.notice||"Corrections saved using the original form number.");
   await reload();
  }catch(e){setError(e instanceof Error?e.message:"Could not save corrections.");}
  finally{setBusy("");}
 };
 const toggleRemoved=async(row:Application,hide:boolean)=>{
  if(busy)return;
  if(hide&&!window.confirm(
   "Remove "+row.form_number+" from the active Staff list? Its unique number, private PDF, Google Sheet row and audit record will NOT be deleted. You can restore it later."
  ))return;
  setBusy(row.id+"-remove");setError("");setNotice("");
  try{
   const data=await api("/api/staff/application/"+(hide?"hide":"restore"),post({recordId:row.id}));
   setNotice(data.message||"Form view updated.");
   await reload();
  }catch(e){setError(e instanceof Error?e.message:"Could not change form visibility.");}
  finally{setBusy("");}
 };
 const messageFor=(row:Application)=>{
  return "Dear "+row.student_name+",\n\nYour "+
   (row.kind==="admission"?"admission application":"ECCE Scholarship registration")+
   " has been recorded with *Nitya Academy, Bharatpur*.\n"+
   "*Student Name:* "+row.student_name+"\n"+
   (row.kind==="admission"?"*Application Number:* ":"*Registration Number:* ")+row.form_number+
   "\n\nPlease keep your form number and PDF for future reference. "+
   "This acknowledgement does not confirm final admission, scholarship selection or payment.\n\n"+
   "*NITYA ACADEMY, BHARATPUR*\nNear Ketan Gate, Sahyog Nagar, Bharatpur 321001"+
   "\nContact: +91 9680008384 | +91 9802813444";
 };
 const whatsapp=(row:Application)=>{
  const number=(row.mobile||"").replace(/\D/g,"");
  window.open("https://wa.me/"+(/^[6-9]\d{9}$/.test(number)?"91"+number:"")+
   "?text="+encodeURIComponent(messageFor(row)),"_blank","noopener,noreferrer");
 };
 const prepareShare=async(row:Application)=>{
  if(busy)return;
  setBusy(row.id+"-share");setError("");setPreparedShare(null);
  try{
   const file=await fetchStaffPdfFile(row.id,row.form_number);
   if(!canShareStaffPdf(file))
    throw Error("This device cannot send a PDF through the native Share menu. Download it and attach in WhatsApp manually.");
   setPreparedShare({id:row.id,file});
   setNotice("PDF ready. Tap 'Share PDF + Message', choose WhatsApp and select the recipient.");
  }catch(e){setError(e instanceof Error?e.message:"Could not prepare PDF for WhatsApp.");}
  finally{setBusy("");}
 };
 const sharePrepared=(row:Application)=>{
  if(!preparedShare||preparedShare.id!==row.id)return;
  void sharePreparedStaffPdf(preparedShare.file,messageFor(row)).catch(e=>{
   if(e?.name!=="AbortError")
    setError("WhatsApp cannot accept the file + message from this browser. Download the PDF and attach it manually.");
  });
 };
 const editingKeys=useMemo(()=>{
  if(!editing)return [] as string[];
  const keys=Object.keys(editFields).filter(k=>!systemKeys.has(k));
  return [...orderedKeys.filter(k=>keys.includes(k)),...keys.filter(k=>!orderedKeys.includes(k))];
 },[editFields,editing]);
 const renderInput=(key:string)=>{
  const opts=key==="course"?courses.filter(c=>c.active).map(c=>({value:c.id,label:c.name})):choice[key];
  const value=editFields[key]||"";
  const common="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-sm";
  return <label key={key} className="block text-sm font-medium text-slate-700">
   {labels[key]||key}
   {opts?<select value={value} onChange={e=>setEditFields(p=>({...p,[key]:e.target.value}))}
     className={common}>
      {!opts.some(x=>x.value===value)&&<option value={value}>{value||"Select"}</option>}
      {opts.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
     </select>:longFields.has(key)?<textarea value={value} rows={2} maxLength={700}
     onChange={e=>setEditFields(p=>({...p,[key]:e.target.value}))} className={common}/>:
     <input type={key==="dob"||key==="examDate"?"date":"text"}
      value={value} maxLength={key==="aadhaar"?12:["mobile","whatsapp"].includes(key)?10:key==="pin"?6:500}
      inputMode={digits.has(key)?"numeric":undefined}
      onChange={e=>setEditFields(p=>({...p,[key]:digits.has(key)?e.target.value.replace(/\D/g,""):e.target.value}))}
      className={common}/>}
  </label>;
 };
 return <section className="rounded-2xl border bg-white p-4 sm:p-6 space-y-4" aria-label={kind==="admission"?"Admission records":"Scholarship records"}>
  <div className="flex flex-wrap justify-between items-start gap-3">
   <div><h3 className="font-bold text-lg flex items-center gap-2"><FileClock size={20}/>{kind==="admission"?"Admission Records":"Scholarship Records"}</h3>
    <p className="text-sm text-slate-600">{kind==="admission"?"Admission applications only.":"Scholarship registrations only."} Download or correct a form without issuing a second number.</p>
   </div>
   <div className="flex items-center gap-2">
    <button type="button" onClick={()=>{setRemoved(!removed);setEditing(null);setNotice("");}}
      className="border rounded-lg px-3 py-2 text-sm">{removed?"Active Forms":"Removed Forms"}</button>
    <button type="button" onClick={()=>void reload()} disabled={!!busy}
      className="border rounded-lg px-3 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
      <RefreshCw size={15}/>{busy==="load"?"Loading...":"Refresh"}
    </button>
   </div>
  </div>
  {removed&&<p className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
   Removed Forms are only hidden from active Staff view. Issued numbers, private Drive PDFs, Google Sheet rows and audit records remain unchanged.
  </p>}
  {error&&<p role="alert" className="text-sm text-red-800 bg-red-50 rounded-lg p-3">{error}</p>}
  {notice&&<p role="status" className="text-sm text-green-900 bg-green-50 rounded-lg p-3">{notice}</p>}
  {rows.length===0&&!busy&&<p className="text-sm text-slate-600">{removed?"No removed forms.":"No submitted forms yet."}</p>}
  {rows.map(row=><article key={row.id} className="border rounded-xl p-3 sm:p-4 space-y-2">
   <div className="flex flex-wrap items-center justify-between gap-2">
    <div><p className="font-bold text-slate-900">{row.form_number}</p>
     <p className="text-sm text-slate-600">{row.kind==="admission"?"Admission":"ECCE Scholarship"} · {row.student_name}
      {row.revision_number>0?" · Edited "+row.revision_number+" time(s)":""}</p>
    </div>
    <div className="text-sm space-y-1">
     <p>PDF: <strong>{row.document_status==="ready"&&row.pdf_drive_id?"Ready":"Pending / Retry Required"}</strong></p>
     <p>Google Sheet: <strong>{row.sheet_sync_status==="synced"?"Synced":"Pending / Retry Required"}</strong></p>
    </div>
   </div>
   <div className="flex gap-2 flex-wrap">
    {!removed&&row.document_status==="ready"&&row.pdf_drive_id&&<button type="button"
      disabled={!!busy} onClick={()=>void downloadPdf(row)}
      className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm disabled:opacity-50">
      <Download size={16}/>{busy===row.id+"-pdf"?"Downloading...":"Download PDF"}
    </button>}
    {!removed&&(row.sheet_sync_status!=="synced"||row.document_status!=="ready")&&<button
      type="button" disabled={!!busy} onClick={()=>void retry(row)}
      className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm disabled:opacity-50">
      <RefreshCw size={16}/>{busy===row.id?"Retrying...":"Retry PDF / Google Sheet"}
    </button>}
    {!removed&&<button type="button" disabled={!!busy} onClick={()=>void openEditor(row)}
      className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm disabled:opacity-50">
      <Pencil size={16}/>Edit Form
    </button>}
    {!removed&&row.document_status==="ready"&&row.pdf_drive_id&&
      <button type="button" disabled={!!busy} onClick={()=>void prepareShare(row)}
      className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm disabled:opacity-50">
       <MessageCircle size={16}/>{busy===row.id+"-share"?"Preparing PDF...":"Prepare PDF + Message Share"}
      </button>}
    {!removed&&preparedShare?.id===row.id&&canShareStaffPdf(preparedShare.file)&&
      <button type="button" onClick={()=>sharePrepared(row)}
       className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm">
       <MessageCircle size={16}/>Share PDF + Message
      </button>}
    {!removed&&row.document_status==="ready"&&row.pdf_drive_id&&<button type="button"
      className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm" onClick={()=>whatsapp(row)}>
      <MessageCircle size={16}/>WhatsApp Text (Desktop)
    </button>}
    {removed?<button type="button" disabled={!!busy} onClick={()=>void toggleRemoved(row,false)}
      className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm disabled:opacity-50">
      <RotateCcw size={16}/>Restore
    </button>:<button type="button" disabled={!!busy} onClick={()=>void toggleRemoved(row,true)}
      className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-red-700 disabled:opacity-50">
      <Archive size={16}/>Remove from Staff List
    </button>}
   </div>
   <p className="text-xs text-slate-500">On compatible phones, Prepare then Share PDF + Message and select WhatsApp. On desktop, download the PDF, open WhatsApp text, attach the PDF manually.</p>
  </article>)}
  {editing&&<div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-start overflow-y-auto p-3 sm:p-8" role="dialog" aria-modal="true" aria-label={"Edit "+editing.number}>
   <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-5 space-y-5 my-4">
    <div className="flex justify-between items-center gap-3">
     <div><h3 className="font-bold text-xl">Edit Existing Form</h3>
      <p className="text-sm text-slate-700">Number <strong>{editing.number}</strong> will NOT change.</p>
     </div>
     <button type="button" onClick={()=>setEditing(null)} disabled={!!busy} className="rounded-lg border p-2" aria-label="Close edit form"><X size={20}/></button>
    </div>
    <p className="text-sm rounded-lg bg-blue-50 p-3 text-blue-900">
     Save corrections only. Private PDF will be regenerated and the existing Google Sheet row updated (or marked for retry). Check sensitive details carefully before saving.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
     {editingKeys.map(renderInput)}
    </div>
    <div className="flex gap-2 justify-end flex-wrap border-t pt-4">
     <button type="button" onClick={()=>setEditing(null)} disabled={!!busy} className="rounded-lg border px-4 py-2">Cancel</button>
     <button type="button" onClick={()=>void saveEdit()} disabled={!!busy}
      className="pill-btn-primary inline-flex items-center gap-2 disabled:opacity-50">
      <Save size={16}/>{busy==="save-edit"?"Saving...":"Save Corrections"}
     </button>
    </div>
   </div>
  </div>}
  <p className="text-xs text-slate-500">Only your latest 60 {kind==="admission"?"admission":"scholarship"} records are shown.</p>
 </section>;
}
