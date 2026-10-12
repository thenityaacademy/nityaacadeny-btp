import { useCallback, useEffect, useState } from "react";
import { ImagePlus, RefreshCw, Trash2, ShieldCheck } from "lucide-react";
type Course={id:string;name:string;category:string;active:boolean;hasLogo:boolean;logoActive:boolean};
type Ready={configured:boolean;urlConfigured:boolean;secretConfigured:boolean;message?:string};
async function api(path:string,options?:RequestInit){
 const res=await fetch(path,{credentials:"include",cache:"no-store",...options});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(data.error||"Logo management temporarily unavailable");
 return data;
}
const categories=[["vocational","Vocational Courses"],["skill","Skill Courses"],["university","University Courses"],["other","Other Courses"]];
export default function StaffCourseLogosAdmin(){
 const [courses,setCourses]=useState<Course[]>([]);
 const [ready,setReady]=useState<Ready|null>(null);
 const [loading,setLoading]=useState(true);
 const [pending,setPending]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [revision,setRevision]=useState(0);
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const [cs,cfg]=await Promise.all([api("/api/admin/staff/courses"),api("/api/admin/staff/drive-ready")]);
   setCourses(cs.courses||[]);setReady(cfg);
  }catch(e){setError(e instanceof Error?e.message:"Could not load course logos");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 const upload=async(course:Course,file:File|null)=>{
  if(!file)return;
  if(!["image/png","image/jpeg"].includes(file.type)||file.size>2097152||file.size<1){
   setError("Choose a valid PNG or JPG logo, maximum 2 MB.");return;
  }
  setPending(course.id);setError("");setNotice("");
  try{
   const form=new FormData();
   form.append("id",course.id);form.append("logo",file);
   await api("/api/admin/staff/course-logo",{method:"POST",body:form});
   setCourses(old=>old.map(x=>x.id===course.id?{...x,hasLogo:true,logoActive:true}:x));
   setRevision(v=>v+1);
   setNotice(course.name+" — Extra Logo uploaded privately and activated.");
  }catch(e){setError(e instanceof Error?e.message:"Logo upload failed");}
  finally{setPending("");}
 };
 const toggle=async(course:Course)=>{
  setPending(course.id);setError("");setNotice("");
  try{
   await api("/api/admin/staff/course-logo-status",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({id:course.id,active:!course.logoActive})
   });
   setCourses(old=>old.map(x=>x.id===course.id?{...x,logoActive:!x.logoActive}:x));
   setNotice(course.name+" — Extra Logo "+(course.logoActive?"deactivated":"activated")+".");
  }catch(e){setError(e instanceof Error?e.message:"Could not update logo status");}
  finally{setPending("");}
 };
 const remove=async(course:Course)=>{
  if(!window.confirm("Remove extra PDF Logo for "+course.name+"? This permanently removes its private Drive copy."))return;
  setPending(course.id);setError("");setNotice("");
  try{
   await api("/api/admin/staff/course-logo?id="+encodeURIComponent(course.id),{method:"DELETE"});
   setCourses(old=>old.map(x=>x.id===course.id?{...x,hasLogo:false,logoActive:false}:x));
   setNotice(course.name+" — Extra Logo removed.");
  }catch(e){setError(e instanceof Error?e.message:"Cannot delete logo");}
  finally{setPending("");}
 };
 return <section className="bg-white rounded-2xl border p-5 md:p-6 space-y-4">
  <div className="flex justify-between items-start flex-wrap gap-3">
   <div><h3 className="text-xl font-bold">Course PDF Extra Logos</h3>
    <p className="text-sm text-slate-600 mt-1">Upload course-specific logos from this Admin panel. Nitya Academy's own logo remains the main PDF logo. Extra Logos are active/inactive independently of Course admission status.</p>
   </div>
   <button type="button" disabled={loading||!!pending} onClick={()=>void load()}
    className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm disabled:opacity-50">
    <RefreshCw size={16}/> Refresh
   </button>
  </div>
  {ready&&!ready.configured&&<div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 p-3 text-sm">
   <strong>Google Drive connection must be configured before upload works.</strong>
   <p className="mt-1">In Cloudflare → Worker → Production → Settings, add <code>STAFF_SHEETS_URL</code> (variable) and <code>STAFF_SHEETS_SECRET</code> (Secret) for the existing authorized Apps Script Web App. Do not paste secrets into chat.</p>
   <p className="mt-1 text-xs">URL: {ready.urlConfigured?"configured":"missing"} · Secret: {ready.secretConfigured?"configured":"missing"}. Staff Login and other site features are unaffected.</p>
  </div>}
  {ready?.configured&&<p className="text-sm text-blue-800 border border-blue-100 rounded-xl bg-blue-50 p-3 flex items-center gap-2">
   <ShieldCheck size={17}/> Google Drive bridge configured; upload will verify script access.
  </p>}
  {loading&&<p className="text-sm text-slate-500">Loading course list...</p>}
  {error&&<p role="alert" className="text-sm text-red-700 border rounded-lg bg-red-50 p-3">{error}</p>}
  {notice&&<p role="status" className="text-sm text-green-800 border rounded-lg bg-green-50 p-3">{notice}</p>}
  {categories.map(([category,heading])=>{
   const items=courses.filter(c=>c.category===category);
   return items.length?<div key={category} className="space-y-2">
    <h4 className="font-semibold">{heading}</h4>
    <div className="border rounded-xl divide-y">
     {items.map(course=><div key={course.id} className="p-3 sm:p-4 space-y-3">
      <div className="flex justify-between items-center gap-3">
       <div><strong className="text-sm">{course.name}</strong>
        <p className={course.logoActive?"text-xs text-green-700":"text-xs text-slate-500"}>
         Extra PDF Logo: {course.logoActive?"Active":course.hasLogo?"Inactive":"Not Uploaded"}
        </p>
       </div>
       {course.hasLogo&&ready?.configured&&<img
        src={"/api/admin/staff/course-logo?id="+encodeURIComponent(course.id)+"&v="+revision}
        alt={course.name+" Logo"} className="object-contain bg-white rounded border w-14 h-14"/>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
       <label className={"inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm "+
        (ready?.configured&&pending!==course.id?"cursor-pointer":"opacity-50 cursor-not-allowed")}>
        <ImagePlus size={16}/>{pending===course.id?"Uploading...":course.hasLogo?"Replace Logo":"Upload Logo"}
        <input type="file" accept="image/jpeg,image/png" className="sr-only"
         disabled={!ready?.configured||!!pending}
         onChange={e=>{void upload(course,e.currentTarget.files?.[0]||null);e.currentTarget.value="";}}/>
       </label>
       {course.hasLogo&&<>
        <button type="button" disabled={!!pending} onClick={()=>void toggle(course)}
         className="border rounded-lg px-3 py-2 text-sm disabled:opacity-50">
         {course.logoActive?"Deactivate Logo":"Activate Logo"}
        </button>
        <button type="button" disabled={!!pending||!ready?.configured} onClick={()=>void remove(course)}
         className="border rounded-lg px-3 py-2 text-red-700 text-sm disabled:opacity-40 inline-flex items-center gap-1">
         <Trash2 size={15}/> Remove
        </button>
       </>}
      </div>
     </div>)}
    </div>
   </div>:null;
  })}
  <p className="text-xs text-slate-500">JPG/PNG, maximum 2 MB. This section manages only Extra Logos for future PDFs. It does not enable PDF generation or make private Drive files public.</p>
 </section>;
}
