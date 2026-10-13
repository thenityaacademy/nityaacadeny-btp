import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Settings, ClipboardList, BookOpen, RefreshCw, ShieldCheck, Save } from "lucide-react";
import StaffPhotoStorageAdmin from "./StaffPhotoStorageAdmin";

type Course = {
  id:string;name:string;category:string;active:boolean;
  defaultFee:number|null;hasLogo:boolean;logoActive:boolean;
};
type Series={sequence_key:string;prefix:string;next_number:number;end_number:number};
type Config={enquiryUrl:string;admissionTerms:string;scholarshipTerms:string};
type PhaseStatus={
  phase:"phase2";status:"login_active";
  staffAccounts:number;staffApplications:number;extraLogosActive:number;
};
const headings:Record<string,string>={
  vocational:"Vocational Courses",skill:"Skill Courses",
  university:"University Courses",other:"Other Courses"
};
const categories=["vocational","skill","university","other"];

async function call(path:string,init?:RequestInit){
  const result=await fetch(path,{credentials:"include",cache:"no-store",...init});
  const body=await result.json().catch(()=>({}));
  if(!result.ok)throw new Error(body.error||"Staff Portal Settings unavailable");
  return body;
}
const post=(body:unknown):RequestInit=>({
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify(body)
});
const blank:Config={enquiryUrl:"",admissionTerms:"",scholarshipTerms:""};

export default function StaffPortalSetupAdmin(){
  const [courses,setCourses]=useState<Course[]>([]);
  const [series,setSeries]=useState<Series|null>(null);
  const [admissionSeries,setAdmissionSeries]=useState<Series|null>(null);
  const [admissionLast,setAdmissionLast]=useState("");
  const [admissionNext,setAdmissionNext]=useState("");
  const [config,setConfig]=useState<Config>(blank);
  const [status,setStatus]=useState<PhaseStatus|null>(null);
  const [prefix,setPrefix]=useState("");
  const [nextNumber,setNextNumber]=useState("");
  const [endNumber,setEndNumber]=useState("");
  const [busy,setBusy]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const reload=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const [courseData,seriesData,configData,statusData]=await Promise.all([
        call("/api/admin/staff/courses"),call("/api/admin/staff/registration-series"),
        call("/api/admin/staff/portal-config"),call("/api/admin/staff/phase2-overview")
      ]);
      setCourses(courseData.courses||[]);
      setSeries(seriesData.series||null);
      setAdmissionSeries(seriesData.admissionSeries||null);
      if(seriesData.admissionSeries){
        setAdmissionLast(String(seriesData.admissionSeries.end_number));
        setAdmissionNext(String(seriesData.admissionSeries.next_number));
      }
      setConfig({
        enquiryUrl:configData.enquiryUrl||"",
        admissionTerms:configData.admissionTerms||"",
        scholarshipTerms:configData.scholarshipTerms||""
      });
      setStatus(statusData);
      if(seriesData.series){
        setPrefix(seriesData.series.prefix);
        setNextNumber(String(seriesData.series.next_number));
        setEndNumber(String(seriesData.series.end_number));
      }
    }catch(e){setError(e instanceof Error?e.message:"Could not load settings");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void reload();},[reload]);

  const toggleCourse=async(c:Course)=>{
    setBusy(c.id);setNotice("");setError("");
    try{
      await call("/api/admin/staff/course-status",post({id:c.id,active:!c.active}));
      setCourses(prev=>prev.map(x=>x.id===c.id?{...x,active:!c.active}:x));
      setNotice(c.name+" "+(!c.active?"enabled":"disabled")+" for Staff Admission (public website course unchanged).");
    }catch(e){setError(e instanceof Error?e.message:"Course update failed");}
    finally{setBusy("");}
  };
  const saveConfig=async(e:FormEvent)=>{
    e.preventDefault();setBusy("config");setNotice("");setError("");
    try{
      await call("/api/admin/staff/portal-config",post(config));
      setNotice("Enquiry Link and Terms saved securely.");
    }catch(e){setError(e instanceof Error?e.message:"Could not save settings");}
    finally{setBusy("");}
  };
  const saveSeries=async(e:FormEvent)=>{
    e.preventDefault();setBusy("series");setNotice("");setError("");
    try{
      const start=Number(nextNumber),end=Number(endNumber);
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end))throw Error("Enter whole numbers");
      await call("/api/admin/staff/registration-series",post({kind:"scholarship",prefix,start,end}));
      setNotice("Scholarship registration range saved. Issued numbers are never reused.");
      await reload();
    }catch(e){setError(e instanceof Error?e.message:"Could not save registration range");}
    finally{setBusy("");}
  };
  const extendAdmission=async(e:FormEvent)=>{
    e.preventDefault();
    if(!admissionSeries)return;
    setBusy("admission-series");setNotice("");setError("");
    try{
      const end=Number(admissionLast),start=Number(admissionNext);
      if(!Number.isSafeInteger(end)||end<admissionSeries.end_number)
        throw Error("Last Admission Number may only be increased");
      if(!Number.isSafeInteger(start)||start<admissionSeries.next_number||start>end+1)
        throw Error("Next Number can only move forward within the configured range");
      await call("/api/admin/staff/registration-series",post({
        kind:"admission",prefix:admissionSeries.prefix,
        start,end
      }));
      setNotice("Admission form number range updated. Previously issued numbers are never reused.");
      await reload();
    }catch(e){setError(e instanceof Error?e.message:"Could not update Admission series");}
    finally{setBusy("");}
  };
  return <section className="space-y-6">
    <div className="rounded-2xl bg-white border p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Staff Portal Settings</h2>
          <p className="text-sm text-slate-600 mt-1">
            Course visibility, enquiry link, Terms and scholarship numbering, managed independently of public website settings.
          </p>
        </div>
        <button type="button" onClick={()=>void reload()} disabled={loading}
          className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm disabled:opacity-50">
          <RefreshCw size={16}/> Refresh
        </button>
      </div>
      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-900 flex gap-2">
        <ShieldCheck size={20} className="shrink-0"/>
        Registration series, Enquiry Link and Terms are managed here. Changing the Next Number affects only future registrations and never renumbers saved forms.
      </div>
      {status&&<p className="text-sm mt-3 text-slate-700">
        Staff Accounts: <strong>{status.staffAccounts}</strong> · Staff Form Records: <strong>{status.staffApplications}</strong> ·
        Active PDF Logos: <strong>{status.extraLogosActive}</strong> (final PDF phase)
      </p>}
      {loading&&<p className="mt-3 text-sm text-slate-500">Loading settings...</p>}
      {error&&<p role="alert" className="mt-3 rounded-lg border bg-red-50 text-red-700 p-3 text-sm">{error}</p>}
      {notice&&<p role="status" className="mt-3 rounded-lg border bg-green-50 text-green-800 p-3 text-sm">{notice}</p>}
    </div>
    <StaffPhotoStorageAdmin />
    <div className="rounded-2xl bg-white border p-5 md:p-6 space-y-4">
      <h3 className="text-xl font-bold flex items-center gap-2"><BookOpen size={21}/>Admission Course Dropdown</h3>
      <p className="text-sm text-slate-600">
        Courses come automatically from your existing Admin → Courses. Disable a course here to hide it from future Staff admissions only.
      </p>
      {courses.length===0&&!loading&&<p className="text-sm text-amber-700">No website courses were found.</p>}
      {categories.map(category=>{
        const items=courses.filter(c=>c.category===category);
        return items.length?<div key={category} className="space-y-2">
          <h4 className="font-semibold">{headings[category]}</h4>
          <div className="border rounded-xl divide-y">
            {items.map(c=><div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div><p className="text-sm font-medium">{c.name}</p><p className={c.active?"text-xs text-green-700":"text-xs text-slate-500"}>
                Admission: {c.active?"Active":"Inactive"}{c.hasLogo?" · Extra PDF Logo uploaded":""}
              </p></div>
              <button type="button" disabled={busy!==""} onClick={()=>void toggleCourse(c)}
                className="text-sm border rounded-lg px-3 py-2 disabled:opacity-50">
                {busy===c.id?"Saving...":c.active?"Disable Admission":"Enable Admission"}
              </button>
            </div>)}
          </div>
        </div>:null;
      })}
    </div>
    <form onSubmit={extendAdmission} className="rounded-2xl bg-white border p-5 md:p-6 space-y-3">
      <h3 className="text-xl font-bold flex items-center gap-2"><ClipboardList size={21}/>Admission Form Number Series</h3>
      <p className="text-sm text-slate-600">
        Admin may advance Next Number or increase Last Number. Previously issued numbers are never reused; skipped numbers cannot be recovered.
      </p>
      {admissionSeries?<div className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="text-sm font-semibold">Prefix
            <input readOnly value={admissionSeries.prefix}
              className="mt-1 border rounded-lg p-3 w-full bg-slate-100"/>
          </label>
          <label className="text-sm font-semibold">Next Number
            <input required type="number" min={admissionSeries.next_number} max={999999999} step={1}
              value={admissionNext} onChange={e=>setAdmissionNext(e.target.value)}
              className="mt-1 border rounded-lg p-3 w-full"/>
          </label>
          <label className="text-sm font-semibold">Last Number
            <input type="number" min={admissionSeries.end_number} max={999999999}
              value={admissionLast} onChange={e=>setAdmissionLast(e.target.value)}
              className="mt-1 border rounded-lg p-3 w-full"/>
          </label>
        </div>
        <p className="text-sm text-blue-800">Next form after save: <strong>{admissionSeries.prefix}{String(Number(admissionNext)||admissionSeries.next_number).padStart(4,"0")}</strong></p>
        <button disabled={busy!==""} className="pill-btn-primary disabled:opacity-50"><Save size={16} className="mr-2"/> Save Admission Range</button>
      </div>:<p className="text-sm text-amber-700">
        Admission series not configured. Contact Admin. Never issue real application numbers before configuration.
      </p>}
    </form>
    <form onSubmit={saveSeries} className="rounded-2xl bg-white border p-5 md:p-6 space-y-4">
      <h3 className="text-xl font-bold flex items-center gap-2"><ClipboardList size={21}/> ECCE Scholarship Registration Series</h3>
      <p className="text-sm text-slate-600">
        Scholarship sequence is independent. Admin may advance Next Number and increase Last Number; old numbers and skipped numbers are never reused.
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-sm font-semibold">Prefix
          <input value={prefix} disabled={!!series} onChange={e=>setPrefix(e.target.value.toUpperCase())}
            maxLength={20} pattern="[A-Za-z0-9-]{0,20}" placeholder="NAECCE"
            className="mt-1 border rounded-lg p-3 w-full disabled:bg-slate-100"/>
        </label>
        <label className="text-sm font-semibold">Next Number
          <input required type="number" min={1} max={999999999} step={1}
            value={nextNumber} min={series?.next_number||1} onChange={e=>setNextNumber(e.target.value)}
            placeholder="2600001" className="mt-1 border rounded-lg p-3 w-full disabled:bg-slate-100"/>
        </label>
        <label className="text-sm font-semibold">Last Number
          <input required type="number" min={series?.end_number||1} max={999999999} step={1}
            value={endNumber} onChange={e=>setEndNumber(e.target.value)}
            placeholder="2605000" className="mt-1 border rounded-lg p-3 w-full"/>
        </label>
      </div>
      <button disabled={busy!==""} className="pill-btn-primary disabled:opacity-50">
        <Save size={16} className="mr-2"/> Save Series
      </button>
      <p className="text-xs text-slate-500">The prefix is locked once issued. Change Next Number only to skip unused numbers; existing registrations stay unchanged.</p>
    </form>
    <form onSubmit={saveConfig} className="rounded-2xl bg-white border p-5 md:p-6 space-y-4">
      <h3 className="text-xl font-bold flex items-center gap-2"><Settings size={21}/> Staff Enquiry and Terms</h3>
      <label className="text-sm font-semibold block">Daily Enquiry Google Form URL
        <input type="url" maxLength={550} value={config.enquiryUrl}
          onChange={e=>setConfig(old=>({...old,enquiryUrl:e.target.value}))}
          placeholder="https://docs.google.com/forms/..."
          className="mt-1 w-full rounded-xl border p-3"/>
        <span className="text-xs text-slate-500 font-normal">Link to your existing enquiry form; automatic Staff reference in that Google Form requires a separate prefill-field configuration.</span>
      </label>
      <label className="block text-sm font-semibold">Admission Terms & Conditions
        <textarea rows={4} maxLength={7000} value={config.admissionTerms}
          onChange={e=>setConfig(old=>({...old,admissionTerms:e.target.value}))}
          className="mt-1 w-full rounded-xl border p-3"/>
      </label>
      <label className="block text-sm font-semibold">ECCE Scholarship Terms & Conditions
        <textarea rows={4} maxLength={7000} value={config.scholarshipTerms}
          onChange={e=>setConfig(old=>({...old,scholarshipTerms:e.target.value}))}
          className="mt-1 w-full rounded-xl border p-3"/>
      </label>
      <button disabled={busy!==""} className="pill-btn-primary disabled:opacity-50">
        <Save size={16} className="mr-2"/> Save Terms & Enquiry Link
      </button>
    </form>
  </section>;
}
