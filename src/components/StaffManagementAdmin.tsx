import { useCallback, useEffect, useState, type FormEvent } from "react";
import { RefreshCw, UserPlus, ShieldCheck, Eye, EyeOff } from "lucide-react";

type StaffRow = { id: string; username: string; name: string; active: number; created_at: string; last_login_at: string | null };
async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: "include", cache: "no-store", ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed. Check API configuration.");
  return data;
}
export default function StaffManagementAdmin() {
  const [staff,setStaff] = useState<StaffRow[]>([]);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [pending,setPending] = useState("");
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  const [id,setId] = useState("");
  const [name,setName] = useState("");
  const [username,setUsername] = useState("");
  const [password,setPassword] = useState("");
  const [showPassword,setShowPassword] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { const data = await api("/api/admin/staff/list"); setStaff(data.staff || []); setError(""); }
    catch(e) { setError(e instanceof Error ? e.message : "Unable to load staff"); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{void refresh();},[refresh]);
  const create = async (event:FormEvent) => {
    event.preventDefault();
    setBusy(true);setError("");setMessage("");
    try {
      await api("/api/admin/staff/create",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:id.trim(),username:username.trim(),name:name.trim(),password})
      });
      setMessage("Staff account created successfully. Share credentials privately.");
      setId("");setName("");setUsername("");setPassword("");
      await refresh();
    } catch(e) {setError(e instanceof Error ? e.message:"Could not create staff");}
    finally {setBusy(false);}
  };
  const toggle = async (staffId:string,active:boolean) => {
    if(!window.confirm(active?"Activate this staff account?":"Deactivate this staff account and revoke its sessions?"))return;
    setPending(staffId);setError("");setMessage("");
    try {
      await api("/api/admin/staff/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:staffId,active})});
      setMessage(active?"Staff activated.":"Staff deactivated.");
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Status update failed");}
    finally{setPending("");}
  };
  return <section className="space-y-6">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="text-2xl font-bold text-slate-900">Staff Management</h2><p className="text-sm text-slate-500 mt-1">Only administrators can create, activate or deactivate staff.</p></div>
      <button type="button" disabled={loading} onClick={()=>void refresh()} className="flex gap-2 items-center border rounded-xl px-3 py-2 text-sm"><RefreshCw size={16}/>Refresh</button>
    </div>
    {error&&<p role="alert" className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm">{error}</p>}
    {message&&<p role="status" className="bg-green-50 text-green-800 border border-green-200 rounded-xl p-3 text-sm">{message}</p>}
    <form onSubmit={create} className="rounded-2xl bg-white p-5 md:p-6 border space-y-4">
      <h3 className="font-bold text-slate-900 flex gap-2 items-center"><UserPlus size={20}/> Create New Staff</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm font-medium">Staff ID *<input required pattern="NA-STF-[0-9]{3,8}" title="Example: NA-STF-001" placeholder="NA-STF-001" autoComplete="off" className="mt-1 w-full p-3 border rounded-xl" value={id} onChange={e=>setId(e.target.value)}/></label>
        <label className="text-sm font-medium">Full Name *<input required minLength={2} maxLength={100} placeholder="Staff Full Name" className="mt-1 w-full p-3 border rounded-xl" value={name} onChange={e=>setName(e.target.value)}/></label>
        <label className="text-sm font-medium">Username *<input required minLength={3} maxLength={50} pattern="[a-zA-Z0-9._-]+" placeholder="staff.username" autoComplete="off" className="mt-1 w-full p-3 border rounded-xl" value={username} onChange={e=>setUsername(e.target.value)}/></label>
        <label className="text-sm font-medium">Temporary Password (12+ characters) *
          <span className="relative block mt-1"><input required minLength={12} maxLength={128} type={showPassword?"text":"password"} autoComplete="new-password" className="w-full p-3 pr-12 border rounded-xl" value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" aria-label={showPassword?"Hide password":"Show password"} className="absolute right-3 top-3 text-slate-500" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={20}/>:<Eye size={20}/>}</button></span>
        </label>
      </div>
      <p className="text-xs text-slate-500 flex gap-2 items-center"><ShieldCheck size={17}/>Password is sent to the secure server, not stored in browser settings or Google Sheets.</p>
      <button className="pill-btn-primary disabled:opacity-60" disabled={busy}>{busy?"Creating...":"Create Staff Account"}</button>
    </form>
    <div className="rounded-2xl bg-white border overflow-x-auto">
      <div className="p-5 border-b flex justify-between items-center"><h3 className="font-bold">Staff Accounts</h3><span className="text-sm text-slate-500">{staff.length} total</span></div>
      <table className="min-w-full text-sm text-left"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Staff</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last Login</th><th className="px-4 py-3">Action</th></tr></thead>
      <tbody className="divide-y">{staff.map(row=><tr key={row.id}><td className="px-4 py-3"><div className="font-semibold">{row.name}</div><div className="text-xs text-slate-500">{row.id}</div></td><td className="px-4 py-3">{row.username}</td><td className="px-4 py-3"><span className={row.active?"text-green-700 font-medium":"text-red-700 font-medium"}>{row.active?"Active":"Inactive"}</span></td><td className="px-4 py-3">{row.last_login_at?new Date(row.last_login_at+"Z").toLocaleString("en-IN"):"Never"}</td><td className="px-4 py-3"><button type="button" disabled={pending===row.id} className="px-3 py-2 rounded-lg border disabled:opacity-60 hover:bg-slate-50" onClick={()=>void toggle(row.id,!row.active)}>{pending===row.id?"Updating...":row.active?"Deactivate":"Activate"}</button></td></tr>)}</tbody>
      </table>
      {!loading&&staff.length===0&&<p className="text-center p-6 text-slate-500">No staff accounts found.</p>}
      {loading&&<p className="text-center p-6 text-slate-500">Loading staff accounts...</p>}
    </div>
  </section>;
}
