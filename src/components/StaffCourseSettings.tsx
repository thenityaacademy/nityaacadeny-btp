import { useEffect, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
type Course = { id:string;name:string;category:string;active:boolean;hasLogo:boolean;logoActive:boolean };
const groups = ["vocational","skill","university","other"];
const names:Record<string,string>={vocational:"Vocational Courses",skill:"Skill Courses",university:"University Courses",other:"Other Courses"};
async function call(path:string,init?:RequestInit) {
  const res=await fetch(path,{credentials:"include",cache:"no-store",...init});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
export default function StaffCourseSettings(){
  const [courses,setCourses]=useState<Course[]>([]);
  const [loading,setLoading]=useState(true);
  const [pending,setPending]=useState("");
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [rev,setRev]=useState(0);
  const [bridge,setBridge]=useState<{configured:boolean;urlConfigured:boolean;secretConfigured:boolean}|null>(null);
  const [bridgeError,setBridgeError]=useState("");
  const checkBridge=async()=>{
    try{
      const status=await call("/api/admin/staff/bridge-status");
      setBridge(status);setBridgeError("");
    }catch(e){setBridgeError(e instanceof Error?e.message:"Connection check unavailable");}
  };
  const reload=async()=>{
    setLoading(true);
    try{const data=await call("/api/admin/staff/courses");setCourses(data.courses||[]);setError("");}
    catch(e){setError(e instanceof Error?e.message:"Could not load courses");}
    finally{setLoading(false);}
  };
  useEffect(()=>{void reload();void checkBridge();},[]);
  const toggleCourse=async(course:Course)=>{
    setPending(course.id);setError("");setMessage("");
    try{
      await call("/api/admin/staff/course-status",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:course.id,active:!course.active})
      });
      setCourses(old=>old.map(c=>c.id===course.id?{...c,active:!c.active}:c));
      setMessage("Admission dropdown: "+course.name+" "+(course.active?"Inactive":"Active"));
    }catch(e){setError(e instanceof Error?e.message:"Could not change course status");}
    finally{setPending("");}
  };
  const upload=async(course:Course,file:File|null)=>{
    if(!file)return;
    if(file.size>2097152){setError("Logo must be under 2 MB");return;}
    setPending(course.id);setError("");setMessage("");
    try{
      const body=new FormData();
      body.append("id",course.id);body.append("logo",file);
      await call("/api/admin/staff/course-logo",{method:"POST",body});
      setCourses(old=>old.map(c=>c.id===course.id?{...c,hasLogo:true,logoActive:true}:c));
      setRev(n=>n+1);
      setMessage("PDF extra logo uploaded and activated for "+course.name);
    }catch(e){setError(e instanceof Error?e.message:"Logo upload failed");}
    finally{setPending("");}
  };
  const toggleLogo=async(course:Course)=>{
    setPending(course.id);setError("");setMessage("");
    try{
      await call("/api/admin/staff/course-logo-status",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:course.id,active:!course.logoActive})
      });
      setCourses(old=>old.map(c=>c.id===course.id?{...c,logoActive:!c.logoActive}:c));
      setMessage("PDF extra logo "+(!course.logoActive?"activated":"deactivated")+" for "+course.name);
    }catch(e){setError(e instanceof Error?e.message:"Logo status update failed");}
    finally{setPending("");}
  };
  const remove=async(course:Course)=>{
    if(!window.confirm("Remove course extra logo for "+course.name+"? Previously generated PDFs will be preserved."))return;
    setPending(course.id);setError("");setMessage("");
    try{
      await call("/api/admin/staff/course-logo?id="+encodeURIComponent(course.id),{method:"DELETE"});
      setCourses(old=>old.map(c=>c.id===course.id?{...c,hasLogo:false,logoActive:false}:c));
      setMessage("Extra logo removed from "+course.name);
    }catch(e){setError(e instanceof Error?e.message:"Logo removal failed");}
    finally{setPending("");}
  };
  return <section className="bg-white rounded-2xl border p-5 md:p-6 space-y-4">
    <div className="flex justify-between gap-3 items-start">
      <div><h3 className="text-lg font-semibold">Staff Admission Course & PDF Logos</h3>
        <p className="text-sm text-slate-500">Website course catalog से linked। Course visibility और PDF Extra Logo की Active/Inactive setting अलग-अलग हैं। Nitya Academy का main logo हमेशा PDF में रहेगा।</p>
      </div>
      <button type="button" onClick={()=>void reload()} disabled={loading} className="rounded-lg px-3 py-2 border text-sm">Refresh</button>
    </div>
    <div className="rounded-xl border p-3 text-sm flex flex-wrap gap-3 items-center justify-between">
      <div>
        <strong>Google Drive Connection:</strong>{" "}
        {!bridge?"Checking...":bridge.configured?"Configured (not yet tested)":"Not Configured"}
        {bridge && !bridge.configured && <span className="block text-amber-800 text-xs mt-1">
          Missing Preview binding(s): {!bridge.urlConfigured?"STAFF_SHEETS_URL ":""}{!bridge.secretConfigured?"STAFF_SHEETS_SECRET":""}.
          Cloudflare → Worker → Settings → Preview variables/secrets needs review.
        </span>}
        {bridge?.configured && <span className="block text-slate-500 text-xs mt-1">
          URL and secret present; Google Apps Script authorization must be tested separately.
        </span>}
        {bridgeError && <span className="block text-red-700 text-xs mt-1">{bridgeError}</span>}
      </div>
      <button type="button" onClick={()=>void checkBridge()} className="border rounded-lg px-3 py-2 text-xs">Check Connection</button>
    </div>
    {error&&<p className="text-red-700 text-sm border border-red-200 bg-red-50 rounded-lg p-3" role="alert">{error}</p>}
    {message&&<p className="text-green-700 text-sm" role="status">{message}</p>}
    {loading&&<p className="text-sm text-slate-500">Loading courses...</p>}
    {!loading&&courses.length===0&&<p className="text-sm text-amber-700">No website courses found. Check Admin → Courses.</p>}
    {groups.map(group=>{
      const items=courses.filter(c=>c.category===group);
      return items.length? <div key={group} className="space-y-2">
        <h4 className="font-semibold text-slate-800">{names[group]}</h4>
        <div className="divide-y rounded-xl border">
          {items.map(course=><div key={course.id} className="p-3 md:p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm"><span className="font-semibold">{course.name}</span>
                <span className={"ml-2 text-xs "+(course.active?"text-green-700":"text-slate-500")}>Admission: {course.active?"Active":"Inactive"}</span>
              </div>
              <button type="button" disabled={pending===course.id} onClick={()=>void toggleCourse(course)}
                className="text-sm rounded-lg border px-3 py-2 disabled:opacity-50">{course.active?"Disable Admission":"Enable Admission"}</button>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {course.hasLogo && <img className="w-12 h-12 object-contain bg-white border rounded-lg"
                  src={"/api/admin/staff/course-logo?id="+encodeURIComponent(course.id)+"&v="+rev}
                  alt={course.name+" extra logo"} />}
                <div className="text-sm">
                  <p className="font-medium">PDF Extra Logo</p>
                  <p className={course.logoActive?"text-green-700":"text-slate-500"}>{course.logoActive?"Active":course.hasLogo?"Inactive":"Not uploaded"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="relative inline-flex gap-2 items-center text-xs rounded-lg bg-white border px-3 py-2 cursor-pointer">
                  <ImagePlus size={15}/> {course.hasLogo?"Replace Logo":"Upload Logo"}
                  <input type="file" accept="image/png,image/jpeg"
                    disabled={pending===course.id}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    onChange={e=>{void upload(course,e.target.files?.[0]||null);e.currentTarget.value="";}}/>
                </label>
                {course.hasLogo&&<>
                  <button type="button" disabled={pending===course.id} onClick={()=>void toggleLogo(course)}
                    className="border px-3 py-2 rounded-lg text-xs">{course.logoActive?"Deactivate Logo":"Activate Logo"}</button>
                  <button type="button" aria-label={"Remove extra logo for "+course.name}
                    disabled={pending===course.id} onClick={()=>void remove(course)}
                    className="border px-3 py-2 rounded-lg text-red-700"><Trash2 size={15}/></button>
                </>}
              </div>
            </div>
          </div>)}
        </div>
      </div> : null;
    })}
    <p className="text-xs text-slate-500">JPG/PNG, maximum 2 MB. Course logos are stored privately in Nitya Academy Google Drive. Upload requires the updated Google Apps Script deployment and matching Preview secret.</p>
  </section>;
}
