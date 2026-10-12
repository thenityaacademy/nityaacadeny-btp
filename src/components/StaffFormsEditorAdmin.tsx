import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  STAFF_FORM_FIELD_SPECS, defaultFormEditor,
  type FormEditorConfig, type StaffFormKind, type ExtraField
} from "../data/staffFormEditor";
import { Save, Plus, Trash2, LockKeyhole, RefreshCw } from "lucide-react";

async function call(path:string,init?:RequestInit){
 const response=await fetch(path,{credentials:"include",cache:"no-store",...init});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(result.error||"Form settings unavailable");
 return result;
}
export default function StaffFormsEditorAdmin(){
 const [settings,setSettings]=useState<FormEditorConfig>(defaultFormEditor);
 const [kind,setKind]=useState<StaffFormKind>("admission");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");setSuccess("");
  try{
   const result=await call("/api/admin/staff/form-editor");
   setSettings(result.formEditor||defaultFormEditor());
  }catch(e){setError(e instanceof Error?e.message:"Unable to load editor");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 const updateField=(key:string,change:Partial<{label:string;visible:boolean;required:boolean}>)=>{
  setSettings(previous=>({...previous,[kind]:{...previous[kind],fields:{
   ...previous[kind].fields,[key]:{...previous[kind].fields[key],...change}
  }}}));
 };
 const updateExtra=(id:string,change:Partial<ExtraField>)=>{
  setSettings(previous=>({...previous,[kind]:{...previous[kind],extras:
   previous[kind].extras.map(item=>item.id===id?{...item,...change}:item)
  }}));
 };
 const addExtra=()=>{
  const id="custom_"+crypto.randomUUID().replace(/-/g,"").slice(0,12);
  setSettings(previous=>({...previous,[kind]:{...previous[kind],extras:[
   ...previous[kind].extras,
   {id,label:"New Field",type:"text",required:false,options:[]}
  ]}}));
 };
 const deleteExtra=(id:string)=>{
  setSettings(previous=>({...previous,[kind]:{...previous[kind],
   extras:previous[kind].extras.filter(item=>item.id!==id)
  }}));
 };
 const save=async(e:FormEvent)=>{
  e.preventDefault();setError("");setSuccess("");setSaving(true);
  try{
   const result=await call("/api/admin/staff/form-editor",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({formEditor:settings})
   });
   setSettings(result.formEditor);
   setSuccess("Both Admission and Scholarship form settings saved successfully. Open the Staff Portal to preview changes.");
  }catch(e){setError(e instanceof Error?e.message:"Could not save form settings");}
  finally{setSaving(false);}
 };
 const specs=STAFF_FORM_FIELD_SPECS[kind];
 return <form onSubmit={save} className="rounded-2xl bg-white border p-5 md:p-6 space-y-4">
  <div className="flex flex-wrap justify-between gap-3 items-center">
   <div><h3 className="text-xl font-bold">Edit Staff Forms</h3>
    <p className="mt-1 text-sm text-slate-600">Rename fields, set required/optional, show/hide fields, or add extra fields. All changes affect form previews immediately after saving.</p></div>
   <button type="button" onClick={()=>void load()} disabled={loading||saving}
    className="border rounded-lg px-3 py-2 text-sm inline-flex gap-2 items-center disabled:opacity-50">
    <RefreshCw size={16}/> Reload
   </button>
  </div>
  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
   These forms are preview-only. No student submissions or PDF generation are enabled. Mandatory identity, course and eligibility fields are protected.
  </div>
  <div className="flex gap-3 flex-wrap">
   <button type="button" onClick={()=>setKind("admission")}
    className={kind==="admission"?"pill-btn-primary":"border rounded-lg px-4 py-2"}>
    Admission Form
   </button>
   <button type="button" onClick={()=>setKind("scholarship")}
    className={kind==="scholarship"?"pill-btn-primary":"border rounded-lg px-4 py-2"}>
    ECCE Scholarship Form
   </button>
  </div>
  {loading?<p className="text-sm text-slate-500">Loading form fields...</p>:<>
   {["Personal","Education","Course / Fees","Scholarship"].map(group=>{
    const fields=specs.filter(field=>field.group===group);
    return fields.length?<div key={group} className="space-y-2">
     <h4 className="font-semibold text-slate-800">{group} Details</h4>
     <div className="divide-y border rounded-xl">
      {fields.map(spec=>{
       const state=settings[kind].fields[spec.key]||{label:spec.label,visible:true,required:spec.required};
       return <div key={spec.key} className="grid gap-3 grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] items-center px-3 py-3">
        <label className="text-xs text-slate-500">
         Field: {spec.key}{spec.locked?" (Protected)":""}
         <input value={state.label} maxLength={95} required
          className="block mt-1 border rounded-lg w-full px-3 py-2 text-sm text-slate-900"
          onChange={e=>updateField(spec.key,{label:e.target.value})}/>
        </label>
        <label className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
         <input type="checkbox" disabled={spec.locked} checked={state.visible}
          onChange={e=>updateField(spec.key,{visible:e.target.checked})}/> Show
        </label>
        <label className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
         <input type="checkbox" disabled={spec.locked||!state.visible} checked={state.required}
          onChange={e=>updateField(spec.key,{required:e.target.checked})}/> Required
         {spec.locked&&<LockKeyhole size={13} className="text-slate-400"/>}
        </label>
       </div>;
      })}
     </div>
    </div>:null;
   })}
   <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-3 justify-between">
     <h4 className="font-semibold">Additional Fields ({settings[kind].extras.length}/12)</h4>
     <button type="button" onClick={addExtra} disabled={settings[kind].extras.length>=12}
      className="inline-flex gap-2 items-center border rounded-lg px-3 py-2 text-sm disabled:opacity-40">
      <Plus size={16}/> Add Field
     </button>
    </div>
    {settings[kind].extras.map(extra=><div key={extra.id} className="border rounded-xl p-3 md:p-4 grid sm:grid-cols-2 gap-3">
     <label className="text-sm">Field Title
      <input required maxLength={95} className="block w-full border rounded-lg p-2 mt-1"
       value={extra.label} onChange={e=>updateExtra(extra.id,{label:e.target.value})}/>
     </label>
     <label className="text-sm">Input Type
      <select value={extra.type} onChange={e=>updateExtra(extra.id,{type:e.target.value as ExtraField["type"],
       options:e.target.value==="select"?["Option 1","Option 2"]:[]})}
       className="block w-full border rounded-lg p-2 mt-1">
       <option value="text">Text</option><option value="number">Number</option>
       <option value="date">Date</option><option value="select">Dropdown</option>
      </select>
     </label>
     {extra.type==="select"&&<label className="text-sm sm:col-span-2">Dropdown Choices — one per line
      <textarea rows={3} className="block mt-1 border rounded-lg p-2 w-full"
       value={extra.options.join("\n")}
       onChange={e=>updateExtra(extra.id,{options:e.target.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)})}/>
     </label>}
     <div className="flex items-center justify-between sm:col-span-2">
      <label className="text-sm inline-flex gap-2 items-center">
       <input type="checkbox" checked={extra.required}
        onChange={e=>updateExtra(extra.id,{required:e.target.checked})}/> Required
      </label>
      <button type="button" onClick={()=>deleteExtra(extra.id)}
       className="inline-flex items-center gap-1 text-sm text-red-700 border rounded-lg px-3 py-2">
       <Trash2 size={15}/> Remove
      </button>
     </div>
    </div>)}
   </div>
  </>}
  {error&&<p role="alert" className="text-sm text-red-700 rounded-lg border border-red-200 bg-red-50 p-3">{error}</p>}
  {success&&<p role="status" className="text-sm text-green-800 rounded-lg border border-green-200 bg-green-50 p-3">{success}</p>}
  <button disabled={loading||saving} className="pill-btn-primary disabled:opacity-50">
   <Save size={16} className="mr-2"/>{saving?"Saving...":"Save Form Changes"}
  </button>
  <p className="text-xs text-slate-500">Field configuration applies to both forms when saved. New custom fields must be mapped to Google Sheets/PDF before actual student submission can be enabled.</p>
 </form>;
}
