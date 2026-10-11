import { useEffect, useState } from "react";
type Course = { id:string;name:string;category:string;active:boolean };
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
  const reload=async()=>{
    setLoading(true);
    try{const data=await call("/api/admin/staff/courses");setCourses(data.courses||[]);setError("");}
    catch(e){setError(e instanceof Error?e.message:"Could not load courses");}
    finally{setLoading(false);}
  };
  useEffect(()=>{void reload();},[]);
  const toggle=async(course:Course)=>{
    setPending(course.id);setError("");setMessage("");
    try{
      await call("/api/admin/staff/course-status",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:course.id,active:!course.active})
      });
      setCourses(old=>old.map(c=>c.id===course.id?{...c,active:!c.active}:c));
      setMessage(course.name+" is now "+(course.active?"Inactive":"Active")+" for Staff Admission.");
    }catch(e){setError(e instanceof Error?e.message:"Could not change course status");}
    finally{setPending("");}
  };
  return <section className="bg-white rounded-2xl border p-5 md:p-6 space-y-4">
    <div className="flex justify-between gap-3 items-start">
      <div><h3 className="text-lg font-semibold">Staff Admission Course List</h3>
        <p className="text-sm text-slate-500">Courses are read from your existing Website Courses settings. Toggle visibility only for the Staff Admission form.</p>
      </div>
      <button type="button" onClick={()=>void reload()} disabled={loading} className="rounded-lg px-3 py-2 border text-sm">Refresh</button>
    </div>
    {error&&<p className="text-red-700 text-sm" role="alert">{error}</p>}
    {message&&<p className="text-green-700 text-sm" role="status">{message}</p>}
    {loading&&<p className="text-sm text-slate-500">Loading courses...</p>}
    {!loading&&courses.length===0&&<p className="text-sm text-amber-700">No website courses found. Check Admin → Courses.</p>}
    {groups.map(group=>{
      const items=courses.filter(c=>c.category===group);
      return items.length? <div key={group} className="space-y-2">
        <h4 className="font-semibold text-slate-800">{names[group]}</h4>
        <div className="divide-y rounded-xl border">
          {items.map(course=><div key={course.id} className="flex items-center justify-between gap-3 px-3 py-3">
            <div className="text-sm"><span className="font-medium">{course.name}</span>
              <span className={"ml-2 text-xs "+(course.active?"text-green-700":"text-slate-500")}>{course.active?"Active":"Inactive"}</span>
            </div>
            <button type="button" disabled={pending===course.id} onClick={()=>void toggle(course)}
              className="text-sm rounded-lg border px-3 py-2 disabled:opacity-50">{pending===course.id?"Saving...":course.active?"Deactivate":"Activate"}</button>
          </div>)}
        </div>
      </div> : null;
    })}
  </section>;
}
