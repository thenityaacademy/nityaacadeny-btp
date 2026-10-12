import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { defaultFormEditor, type FormEditorConfig } from "../data/staffFormEditor";

type Staff={id:string;name:string};
export type PortalCourse={id:string;name:string;category:string;active:boolean;defaultFee:number|null};
export type FormConfig={
  enquiryUrl?:string;courses?:PortalCourse[];admissionTerms?:string;scholarshipTerms?:string;
  photoStorageEnabled?:boolean;submissionsEnabled?:boolean;formEditor?:FormEditorConfig;
};
export type Kind="admission"|"scholarship";
const courseGroups=[
  {id:"vocational",name:"Vocational Courses"},
  {id:"skill",name:"Skill Courses"},
  {id:"university",name:"University Courses"},
  {id:"other",name:"Other Courses"},
];
export default function StaffApplicationPreview({kind,staff,config}:{kind:Kind;staff:Staff;config:FormConfig}){
  const [values,setValues]=useState<Record<string,string>>({});
  const error="";
  const terms=kind==="admission"?config.admissionTerms:config.scholarshipTerms;
  const courses=(config.courses||[]).filter(c=>c.active);
  const fields=(config.formEditor||defaultFormEditor())[kind].fields;
  const extraFields=(config.formEditor||defaultFormEditor())[kind].extras;
  const set=(name:string,value:string)=>{
    setValues(p=>{
      const next={...p,[name]:value};
      if(name==="passed10"&&value==="no")for(const key of ["board10","year10","percent10"])delete next[key];
      if(name==="passed12"&&value==="no")for(const key of ["board12","year12","percent12"])delete next[key];
      return next;
    });
  };
  const v=(key:string)=>values[key]||"";
  const field=(key:string,label:string,required=false,type="text",extras?:{
    inputMode?:"numeric"|"tel"|"decimal";maxLength?:number;placeholder?:string;
  })=>{
    const cfg=fields[key];
    if(cfg && !cfg.visible)return null;
    const displayLabel=cfg?.label||label;
    const conditionalRequired=(key==="practicalFee"&&values.practicalApplicable==="yes")||
      (key==="referenceName"&&values.hasReference==="yes");
    const mustFill=conditionalRequired || (cfg?.required??required);
    return <label key={key} className="block text-sm font-medium text-slate-700">{displayLabel}{mustFill?" *":""}
      <input name={key} className="mt-1 block w-full rounded-lg border border-slate-300 p-3 bg-white" type={type}
        required={mustFill} value={v(key)} inputMode={extras?.inputMode} maxLength={extras?.maxLength}
        placeholder={extras?.placeholder} onChange={e=>{
          const next=(key==="aadhaar"||key==="pin"||key==="year10"||key==="year12"||key==="mobile"||key==="whatsapp")
            ?e.target.value.replace(/\D/g,""):e.target.value;
          set(key,next);
        }}
        pattern={key==="aadhaar"?"[0-9]{12}":(key==="mobile"||key==="whatsapp")?"[0-9]{10}":undefined}/>
    </label>;
  };
  const select=(key:string,label:string,options:{value:string,label:string}[],required=false)=>{
    const cfg=fields[key];
    if(cfg && !cfg.visible)return null;
    const displayLabel=cfg?.label||label;
    return <label key={key} className="block text-sm font-medium text-slate-700">{displayLabel}{(cfg?.required??required)?" *":""}
      <select required={cfg?.required??required} className="mt-1 block w-full rounded-lg border border-slate-300 p-3 bg-white"
        value={v(key)} onChange={e=>set(key,e.target.value)}>
        <option value="">Select {displayLabel}</option>
        {options.map(o=><option value={o.value} key={o.value}>{o.label}</option>)}
      </select>
    </label>;
  };
  const yesNo=[{value:"yes",label:"Yes"},{value:"no",label:"No"}];
  // Preview never performs a request, even if runtime settings change.
  return <form onSubmit={event=>event.preventDefault()} className="rounded-2xl bg-white border p-5 md:p-8 space-y-6">
    <div>
      <h2 className="text-2xl font-bold">{kind === "admission" ? "Student Admission" : "ECCE Scholarship"} Form</h2>
      <p className="text-sm text-slate-600 mt-2">Staff Reference: <strong>{staff.name} ({staff.id})</strong> — verified by server</p>
      <p className="text-sm text-red-700 mt-2 font-semibold">Demo only: do not enter any real student Aadhaar, phone, address or photo. No data is submitted or saved here.</p>
      <p className="text-sm text-amber-800 mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
        {config.submissionsEnabled
          ? "Staff Portal is accepting applications. Check all details carefully before final submission."
          : "Preview only: Final Submit is disabled until secure photo storage, PDF generation and Google Sheet testing are complete."}
      </p>
    </div>
    <section className="space-y-3">
      <h3 className="text-lg font-semibold">Personal Details</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {field("studentName","Student Name",true)}
        {field("fatherName","Father Name",true)}
        {field("motherName","Mother Name")}
        {field("dob","Date of Birth",true,"date")}
        {select("gender","Gender",[
          {value:"male",label:"Male"},{value:"female",label:"Female"},
          {value:"other",label:"Other"},{value:"prefer-not-to-say",label:"Prefer not to say"}
        ],true)}
        {field("aadhaar","Aadhaar Number (12 Digits)",true,"text",{inputMode:"numeric",maxLength:12,placeholder:"12-digit Aadhaar"})}
        {field("mobile","Mobile Number",true,"tel",{inputMode:"numeric",maxLength:10})}
        {field("whatsapp","WhatsApp Number",false,"tel",{inputMode:"numeric",maxLength:10})}
        {field("email","Email",false,"email")}
        {field("address","Full Address",true)}
        {field("city","City / Village")}
        {field("district","District",true)}
        {field("state","State")}
        {field("pin","PIN Code",false,"text",{inputMode:"numeric",maxLength:6})}
      </div>
    </section>
    {kind === "admission" ? <>
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Education Details</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {select("passed10","10th Passed?",yesNo,true)}
          {values.passed10==="yes"&&<>
            {field("board10","10th Board",true)}
            {field("year10","10th Passing Year",true,"text",{inputMode:"numeric",maxLength:4})}
            {field("percent10","10th Percentage",false,"number")}
          </>}
          {select("passed12","12th Passed?",yesNo,true)}
          {values.passed12==="yes"&&<>
            {field("board12","12th Board",true)}
            {field("year12","12th Passing Year",true,"text",{inputMode:"numeric",maxLength:4})}
            {field("percent12","12th Percentage",false,"number")}
          </>}
          {field("lastQualification","Last Qualification")}
          {field("lastBoard","Last Qualification Board / University")}
          {field("lastYear","Last Qualification Passing Year",false,"text",{inputMode:"numeric",maxLength:4})}
          {field("lastPercent","Last Qualification Percentage",false,"number")}
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Course and Fees</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block text-sm font-medium text-slate-700">{fields.course?.label||"Select Course"} *
            <select required value={v("course")} onChange={e=>set("course",e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-3 bg-white">
              <option value="">Select course</option>
              {courseGroups.map(group=>{
                const groupCourses=courses.filter(c=>c.category===group.id);
                return groupCourses.length>0?<optgroup key={group.id} label={group.name}>
                  {groupCourses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>:null;
              })}
            </select>
            {courses.length===0&&<span className="block mt-2 text-red-700">No active courses available. Ask Admin to check Staff Portal course settings.</span>}
          </label>
          {field("session","Session")}
          {field("totalFees","Total Fees (₹)",true,"number")}
          {select("practicalApplicable","Practical Fees Applicable?",yesNo)}
          {values.practicalApplicable==="yes" && field("practicalFee","Practical Fee Amount (₹)",true,"number")}
          {select("hasReference","External Reference?",yesNo)}
          {values.hasReference==="yes" && field("referenceName","Reference Name",true)}
        </div>
      </section>
    </> : <>
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">ECCE Scholarship and Qualification</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="text-sm font-medium text-slate-700">12th Pass (Required)
            <div className="mt-1 rounded-lg border border-slate-300 bg-slate-100 p-3">Yes — mandatory for ECCE Scholarship</div>
          </div>
          {field("year12","12th Passing Year",true,"text",{inputMode:"numeric",maxLength:4})}
          {field("lastQualification","Last Qualification",true)}
          {field("examDate","Exam Date (Optional)",false,"date")}
          <div className="text-sm font-medium text-slate-700">Registration Fee
            <div className="mt-1 rounded-lg border border-slate-300 bg-slate-100 p-3">₹100</div>
          </div>
          {select("paymentMode","Payment Mode",[
            {value:"cash",label:"Cash"},{value:"online",label:"Online"}
          ],true)}
          {values.paymentMode==="online" && field("transactionRef","Transaction Reference (Optional)")}
        </div>
      </section>
    </>}
    {extraFields.length>0&&<section className="space-y-3">
      <h3 className="text-lg font-semibold">Additional Details</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {extraFields.map(extra=><label key={extra.id} className="block text-sm font-medium text-slate-700">
          {extra.label}{extra.required?" *":""}
          {extra.type==="select"?<select required={extra.required} value={v(extra.id)}
            onChange={e=>set(extra.id,e.target.value)} className="block mt-1 border rounded-lg p-3 bg-white w-full">
            <option value="">Select {extra.label}</option>
            {extra.options.map(opt=><option key={opt} value={opt}>{opt}</option>)}
          </select>:<input type={extra.type} required={extra.required} value={v(extra.id)}
            onChange={e=>set(extra.id,e.target.value)} className="block mt-1 border rounded-lg p-3 bg-white w-full"/>}
        </label>)}
      </div>
    </section>}
    <section className="space-y-2">
      <h3 className="text-lg font-semibold">Student Photo</h3>
      <input type="file" accept="image/jpeg,image/png" name="photo" disabled={true}
        className="block w-full rounded-lg border border-slate-200 bg-slate-100 p-3 disabled:cursor-not-allowed"
        />
      <p className="text-sm text-amber-800">
        Photo upload and official PDF will be enabled after the secure Google Drive integration is tested.
      </p>
    </section>
    {terms&&<p className="text-sm text-slate-600 whitespace-pre-wrap p-4 bg-slate-50 rounded-xl">{terms}</p>}
    <label className="flex gap-2 text-sm items-start">
      <input required type="checkbox" className="mt-1"/>
      I confirm that student consent has been obtained and I agree to the Terms & Conditions.
    </label>
    {error&&<p role="alert" className="text-sm text-red-700 flex gap-2"><AlertCircle size={17}/>{error}</p>}
    <button type="button" disabled className="pill-btn-primary disabled:opacity-50">
      Final Submit — Not Enabled
    </button>
  </form>;
}
