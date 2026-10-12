import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { LogIn, LogOut, ShieldCheck, FileText, GraduationCap, Users, LockKeyhole } from "lucide-react";

type Staff={id:string;name:string};
type Dashboard={
  staff:Staff;
  counts:{admissions:number;scholarships:number};
  features:{admissionsEnabled:false;scholarshipsEnabled:false;pdfEnabled:false};
  notice:string;
};
async function api(path:string,init?:RequestInit){
  const response=await fetch(path,{credentials:"include",cache:"no-store",...init});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||"Staff Portal is temporarily unavailable");
  return result;
}
export default function StaffLogin(){
  const [staff,setStaff]=useState<Staff|null>(null);
  const [dashboard,setDashboard]=useState<Dashboard|null>(null);
  const [checking,setChecking]=useState(true);
  const [busy,setBusy]=useState(false);
  const [staffId,setStaffId]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const load=async()=>{
    const current=await api("/api/staff/session");
    if(current.authenticated&&current.staff){
      const summary=await api("/api/staff/dashboard") as Dashboard;
      setStaff(summary.staff);setDashboard(summary);
    }else{setStaff(null);setDashboard(null);}
  };
  useEffect(()=>{
    let mounted=true;
    const check=async()=>{
      try{await load();}
      catch {if(mounted){setStaff(null);setDashboard(null);}}
      finally{if(mounted)setChecking(false);}
    };
    void check();
    return()=>{mounted=false;};
  },[]);
  const login=async(e:FormEvent)=>{
    e.preventDefault();setBusy(true);setError("");
    try{
      await api("/api/staff/login",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({staffId:staffId.trim().toUpperCase(),password})});
      setPassword("");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Unable to log in");}
    finally{setBusy(false);}
  };
  const logout=async()=>{
    setBusy(true);setError("");
    try{await api("/api/staff/logout",{method:"POST"});}
    catch(e){setError(e instanceof Error?e.message:"Could not sign out");}
    finally{setStaff(null);setDashboard(null);setPassword("");setBusy(false);}
  };
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <Link to="/" className="text-blue-700 text-sm font-semibold hover:underline">← Nitya Academy Website</Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold mt-2 text-slate-900">Staff Portal</h1>
          <p className="text-slate-600 mt-1">Nitya Academy, Bharatpur</p>
        </div>
        {staff&&<button type="button" disabled={busy} onClick={()=>void logout()}
          className="inline-flex gap-2 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-white disabled:opacity-50">
          <LogOut size={16}/>Logout
        </button>}
      </div>
      {checking?<div role="status" className="rounded-2xl bg-white border p-8 text-center text-slate-500">
        Checking secure Staff session...
      </div>:!staff?<form onSubmit={login} className="rounded-2xl bg-white border shadow-sm mx-auto max-w-md p-6 sm:p-8 space-y-5">
        <h2 className="text-xl font-bold flex items-center gap-2"><LockKeyhole size={24}/>Staff Login</h2>
        <p className="text-sm text-slate-600">Enter the Staff ID and Password provided by Nitya Academy Admin.</p>
        <label className="block text-sm font-semibold">Staff ID
          <input required autoCapitalize="characters" autoComplete="username" maxLength={20}
            placeholder="NA-STF-001" value={staffId} onChange={e=>setStaffId(e.target.value.toUpperCase())}
            className="mt-2 block w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"/>
        </label>
        <label className="block text-sm font-semibold">Password
          <input required type="password" autoComplete="current-password"
            value={password} onChange={e=>setPassword(e.target.value)}
            className="mt-2 block w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"/>
        </label>
        {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full pill-btn-primary justify-center disabled:opacity-50">
          <LogIn size={17} className="mr-2"/>{busy?"Signing in...":"Login"}
        </button>
        <p className="text-xs text-slate-500 flex items-center gap-2"><ShieldCheck size={17}/>
          Only Admin can create or reset your Staff account.
        </p>
      </form>:<div className="space-y-6">
        <div className="rounded-2xl border bg-white p-5 sm:p-7">
          <h2 className="text-xl font-bold">Welcome, {staff.name}</h2>
          <p className="text-sm text-slate-600 mt-1">Staff ID: <strong>{staff.id}</strong></p>
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            Phase 2: secure Staff Login and Dashboard are active. Admission, Scholarship, PDF and Google Drive
            features remain disabled until their separate testing is complete.
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white border p-6">
            <FileText size={24} className="text-blue-700"/>
            <p className="mt-3 text-sm text-slate-600">Your Admissions</p>
            <p className="text-3xl font-bold mt-1">{dashboard?.counts.admissions??0}</p>
            <p className="text-xs text-slate-500 mt-2">Admission form is not enabled yet.</p>
          </div>
          <div className="rounded-2xl bg-white border p-6">
            <GraduationCap size={24} className="text-blue-700"/>
            <p className="mt-3 text-sm text-slate-600">Your Scholarships</p>
            <p className="text-3xl font-bold mt-1">{dashboard?.counts.scholarships??0}</p>
            <p className="text-xs text-slate-500 mt-2">Scholarship form is not enabled yet.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h3 className="font-bold text-lg flex items-center gap-2"><Users size={20}/>Upcoming Staff Features</h3>
          <p className="text-sm text-slate-600 mt-2">
            Daily Enquiry, Student Admission, ECCE Scholarship, PDF Download and WhatsApp sharing will be
            enabled phase by phase after Admin approval.
          </p>
        </div>
        {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>}
    </div>
  </main>;
}
