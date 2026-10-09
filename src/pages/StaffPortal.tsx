import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { LogIn, LogOut, FileText, GraduationCap, ClipboardList, AlertCircle } from "lucide-react";

type Staff = { id: string; name: string };
type Counts = { enquiries: number; admissions: number; scholarships: number };
type Config = { enquiryUrl?: string; courses?: { id: string; name: string }[]; admissionTerms?: string; scholarshipTerms?: string };
type Kind = "admission" | "scholarship";
const enquiryFallback = "https://docs.google.com/forms/d/e/1FAIpQLSfF9DJ9QMfzqFeB6LKYBT62-rPcwo8cCahNyZFW0oHDrYpLoA/viewform?usp=header";
const fields = [
  ["studentName", "Student Name", "text", true], ["fatherName", "Father Name", "text", true],
  ["motherName", "Mother Name", "text", false], ["dob", "Date of Birth", "date", true],
  ["gender", "Gender", "text", false], ["mobile", "Mobile Number", "tel", true],
  ["whatsapp", "WhatsApp Number", "tel", false], ["email", "Email", "email", false],
  ["aadhaar", "Aadhaar Number", "text", false], ["address", "Full Address", "text", true],
  ["district", "District", "text", true], ["state", "State", "text", false],
  ["pin", "PIN Code", "text", false], ["board12", "12th Board", "text", false],
  ["year12", "12th Passing Year", "text", false], ["percent12", "12th Percentage", "text", false],
  ["lastQualification", "Last Qualification", "text", false],
] as const;

async function request(path: string, options?: RequestInit) {
  const res = await fetch(path, { credentials: "include", cache: "no-store", ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Service unavailable. Please contact admin.");
  return data;
}
function Form({ kind, staff, config, onDone }: { kind: Kind; staff: Staff; config: Config; onDone: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ number: string; pdfUrl?: string } | null>(null);
  const terms = kind === "admission" ? config.admissionTerms : config.scholarshipTerms;
  const set = (name: string, value: string) => setValues(p => ({ ...p, [name]: value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const body = new FormData();
      Object.entries(values).forEach(([key, value]) => body.append(key, value));
      if (photo) body.append("photo", photo);
      // Never trust client-supplied staff identity or registration numbers.
      const data = await request("/api/staff/" + kind, { method: "POST", body });
      setResult({ number: String(data.number), pdfUrl: data.pdfUrl });
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "Submission failed"); }
    finally { setBusy(false); }
  };
  if (result) return <section className="rounded-2xl bg-white border p-8 space-y-4">
    <h2 className="text-2xl font-bold text-green-700">Application submitted</h2>
    <p>Number: <strong>{result.number}</strong></p>
    {result.pdfUrl && <div className="flex gap-4 flex-wrap">
      <a href={result.pdfUrl} target="_blank" rel="noopener noreferrer" className="pill-btn-primary">Download PDF</a>
      <a href={`https://wa.me/?text=${encodeURIComponent("Nitya Academy application " + result.number + ": " + result.pdfUrl)}`} target="_blank" rel="noopener noreferrer" className="pill-btn-outline">Share PDF Link</a>
    </div>}
  </section>;
  return <form onSubmit={submit} className="rounded-2xl bg-white border p-5 md:p-8 space-y-5">
    <h2 className="text-2xl font-bold">{kind === "admission" ? "Student Admission" : "ECCE Scholarship"} Form</h2>
    <p className="text-sm text-slate-600">Staff reference: <strong>{staff.name} ({staff.id})</strong> — verified by server</p>
    <div className="grid sm:grid-cols-2 gap-4">
      {fields.map(([name,label,type,required])=><label className="text-sm font-medium" key={name}>{label}{required ? " *" : ""}
        <input className="mt-1 block w-full rounded-lg border border-slate-300 p-3" type={type} required={required} value={values[name] || ""} onChange={e=>set(name,e.target.value)} />
      </label>)}
      {kind === "admission" ? <>
        <label className="text-sm font-medium">Course *<select required className="mt-1 block w-full rounded-lg border p-3" value={values.course || ""} onChange={e=>set("course",e.target.value)}><option value="">Select Course</option>{(config.courses||[]).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
        <label className="text-sm font-medium">Session<input className="mt-1 block w-full rounded-lg border p-3" value={values.session||""} onChange={e=>set("session",e.target.value)}/></label>
        <label className="text-sm font-medium">Total Fees *<input required min="0" type="number" className="mt-1 block w-full rounded-lg border p-3" value={values.totalFees||""} onChange={e=>set("totalFees",e.target.value)}/></label>
        <label className="text-sm font-medium">Practical Fees?<select className="mt-1 block w-full rounded-lg border p-3" value={values.practicalApplicable||"no"} onChange={e=>set("practicalApplicable",e.target.value)}><option value="no">No</option><option value="yes">Yes</option></select></label>
        {values.practicalApplicable==="yes"&&<label className="text-sm font-medium">Practical Fee Amount *<input required min="0" type="number" className="mt-1 block w-full rounded-lg border p-3" value={values.practicalFee||""} onChange={e=>set("practicalFee",e.target.value)}/></label>}
        <label className="text-sm font-medium">External Reference?<select className="mt-1 block w-full rounded-lg border p-3" value={values.hasReference||"no"} onChange={e=>set("hasReference",e.target.value)}><option value="no">No</option><option value="yes">Yes</option></select></label>
        {values.hasReference==="yes"&&<label className="text-sm font-medium">Reference Name *<input required className="mt-1 block w-full rounded-lg border p-3" value={values.referenceName||""} onChange={e=>set("referenceName",e.target.value)}/></label>}
      </> : <>
        <label className="text-sm font-medium">Registration Date<input type="date" className="mt-1 block w-full rounded-lg border p-3" value={values.registrationDate||new Date().toISOString().slice(0,10)} onChange={e=>set("registrationDate",e.target.value)}/></label>
        <label className="text-sm font-medium">Exam Date (Optional)<input type="date" className="mt-1 block w-full rounded-lg border p-3" value={values.examDate||""} onChange={e=>set("examDate",e.target.value)}/></label>
        <label className="text-sm font-medium">12th Pass? *<select required className="mt-1 block w-full rounded-lg border p-3" value={values.passed12||""} onChange={e=>set("passed12",e.target.value)}><option value="">Select</option><option value="yes">Yes</option><option value="no">No</option></select></label>
        <label className="text-sm font-medium">Registration Fee<input disabled value="₹100" className="mt-1 block w-full rounded-lg border p-3 bg-slate-100" /></label>
        <label className="text-sm font-medium">Payment Mode *<select required className="mt-1 block w-full rounded-lg border p-3" value={values.paymentMode||""} onChange={e=>set("paymentMode",e.target.value)}><option value="">Select</option><option value="cash">Cash</option><option value="online">Online</option></select></label>
        {values.paymentMode==="online"&&<label className="text-sm font-medium">Transaction Reference<input className="mt-1 block w-full rounded-lg border p-3" value={values.transactionRef||""} onChange={e=>set("transactionRef",e.target.value)}/></label>}
      </>}
      <label className="text-sm font-medium">Student Photo<input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full rounded-lg border p-3" onChange={e=>setPhoto(e.target.files?.[0]||null)}/></label>
    </div>
    {terms&&<p className="text-sm text-slate-600 whitespace-pre-wrap p-4 bg-slate-50 rounded-xl">{terms}</p>}
    <label className="flex gap-2 text-sm items-start"><input required type="checkbox" className="mt-1" /> I agree to the terms and confirm that student consent was obtained for this application.</label>
    {error&&<p role="alert" className="text-sm text-red-700 flex gap-2"><AlertCircle size={17}/>{error}</p>}
    <button disabled={busy} className="pill-btn-primary disabled:opacity-50">{busy?"Submitting...":"Final Submit"}</button>
  </form>;
}
export default function StaffPortal() {
  const [staff,setStaff]=useState<Staff|null>(null), [checking,setChecking]=useState(true);
  const [username,setUsername]=useState(""), [password,setPassword]=useState(""), [error,setError]=useState(""), [busy,setBusy]=useState(false);
  const [tab,setTab]=useState<"dashboard"|Kind>("dashboard");
  const [config,setConfig]=useState<Config>({});
  const [counts,setCounts]=useState<Counts>({enquiries:0,admissions:0,scholarships:0});
  const load = async () => {
    const [session,settings,dashboard]=await Promise.all([
      request("/api/staff/session"),request("/api/staff/config"),request("/api/staff/dashboard")
    ]);
    if (!session.authenticated || !session.staff) throw new Error("Not authenticated");
    setStaff(session.staff);setConfig(settings);setCounts(dashboard.counts);
  };
  useEffect(()=>{load().catch(()=>setStaff(null)).finally(()=>setChecking(false));},[]);
  const login=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError("");try{
    await request("/api/staff/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});
    await load();setPassword("");
  }catch(e){setError(e instanceof Error?e.message:"Login failed");}finally{setBusy(false);}};
  const logout=async()=>{await request("/api/staff/logout",{method:"POST"}).catch(()=>{});setStaff(null);setTab("dashboard");};
  if(checking)return <div className="min-h-screen p-16 text-center">Checking staff session...</div>;
  return <main className="min-h-screen bg-slate-50 p-4 md:p-10"><div className="max-w-5xl mx-auto">
    <div className="flex items-center justify-between mb-8"><div><Link to="/" className="text-blue-700 text-sm">← Nitya Academy</Link><h1 className="text-3xl font-extrabold mt-2">Staff Portal</h1><p className="text-slate-500">Nitya Academy, Bharatpur</p></div>{staff&&<button onClick={logout} className="flex items-center gap-2 text-slate-700"><LogOut size={18}/>Logout</button>}</div>
    {!staff?<form onSubmit={login} className="bg-white p-8 rounded-2xl border max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold flex gap-2"><LogIn/>Admin-issued Staff Login</h2>
      <input required autoComplete="username" placeholder="Staff Username" className="w-full border rounded-lg p-3" value={username} onChange={e=>setUsername(e.target.value)}/>
      <input required autoComplete="current-password" type="password" placeholder="Password" className="w-full border rounded-lg p-3" value={password} onChange={e=>setPassword(e.target.value)}/>
      {error&&<p role="alert" className="text-red-700 text-sm">{error}</p>}
      <button disabled={busy} className="pill-btn-primary w-full">{busy?"Signing in...":"Login"}</button>
      <p className="text-slate-500 text-xs">Accounts can only be created by the administrator.</p>
    </form>:<>
      <p className="mb-5">Welcome, <strong>{staff.name}</strong> ({staff.id})</p>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <a href={config.enquiryUrl||enquiryFallback} target="_blank" rel="noopener noreferrer" className="rounded-2xl bg-white border p-6 hover:border-blue-500"><ClipboardList className="mb-3 text-blue-700"/><strong>Daily Enquiry</strong><p className="text-sm text-slate-500">Open existing Google Form</p></a>
        <button onClick={()=>setTab("admission")} className="text-left rounded-2xl bg-white border p-6 hover:border-blue-500"><FileText className="mb-3 text-blue-700"/><strong>Student Admission</strong><p className="text-sm text-slate-500">New admission form</p></button>
        <button onClick={()=>setTab("scholarship")} className="text-left rounded-2xl bg-white border p-6 hover:border-blue-500"><GraduationCap className="mb-3 text-blue-700"/><strong>ECCE Scholarship</strong><p className="text-sm text-slate-500">₹100 registration</p></button>
      </div>
      {tab!=="dashboard"&&<button onClick={()=>setTab("dashboard")} className="mb-5 text-blue-700">← Dashboard</button>}
      {tab==="dashboard"?<div className="grid sm:grid-cols-3 gap-4">{([["Enquiries",counts.enquiries],["Admissions",counts.admissions],["Scholarships",counts.scholarships]] as const).map(([label,count])=><div className="bg-white border rounded-xl p-6" key={label}><div className="text-slate-500">{label}</div><div className="text-3xl font-bold mt-2">{count}</div></div>)}</div>:<Form kind={tab} staff={staff} config={config} onDone={()=>request("/api/staff/dashboard").then(d=>setCounts(d.counts)).catch(()=>{})}/>}
    </>}
  </div></main>;
}
