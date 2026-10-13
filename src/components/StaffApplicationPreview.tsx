import { useEffect, useState } from "react";
import { AlertCircle, ImageUp, Trash2, CheckCircle2, ShieldCheck, Download, MessageCircle, RefreshCcw } from "lucide-react";
import { defaultFormEditor, type FormEditorConfig } from "../data/staffFormEditor";
import { downloadStaffPdf, fetchStaffPdfFile, canShareStaffPdf, sharePreparedStaffPdf } from "../lib/staffPdfDownload";

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
  const [selectedPhoto,setSelectedPhoto]=useState<File|null>(null);
  const [photoPreview,setPhotoPreview]=useState("");
  const [photoConsent,setPhotoConsent]=useState(false);
  const [photoRef,setPhotoRef]=useState<string|null>(null);
  const [photoExpiresAt,setPhotoExpiresAt]=useState("");
  const [photoBusy,setPhotoBusy]=useState(false);
  const [photoError,setPhotoError]=useState("");
  const [photoMessage,setPhotoMessage]=useState("");
  useEffect(()=>{
    if(!selectedPhoto){setPhotoPreview("");return;}
    const url=URL.createObjectURL(selectedPhoto);
    setPhotoPreview(url);
    return()=>URL.revokeObjectURL(url);
  },[selectedPhoto]);
  const choosePhoto=(photo:File|null)=>{
    setPhotoError("");setPhotoMessage("");
    if(!photo){setSelectedPhoto(null);return;}
    if(photoRef){setPhotoError("Remove the previous uploaded photo before selecting another.");return;}
    if(!["image/jpeg","image/png"].includes(photo.type)){
      setPhotoError("Only JPG and PNG files are allowed.");return;
    }
    if(photo.size<1||photo.size>2500000){
      setPhotoError("Photo must be smaller than 2.5 MB.");return;
    }
    setSelectedPhoto(photo);
  };
  const uploadPhoto=async()=>{
    if(!selectedPhoto||!photoConsent||!config.photoStorageEnabled||photoBusy||photoRef)return;
    setPhotoBusy(true);setPhotoError("");setPhotoMessage("");
    try{
      const body=new FormData();
      body.append("kind",kind);
      body.append("photo",selectedPhoto);
      body.append("consent","yes");
      const response=await fetch("/api/staff/photo/upload",{
        method:"POST",credentials:"include",body,cache:"no-store"
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||"Private photo upload failed.");
      if(typeof result.photoId!=="string")throw new Error("No private photo receipt returned.");
      setPhotoRef(result.photoId);
      setPhotoExpiresAt(result.expiresAt||"");
      setPhotoMessage("Photo securely uploaded to your private Drive draft folder. No student application has been submitted.");
    }catch(e){setPhotoError(e instanceof Error?e.message:"Private photo upload failed");}
    finally{setPhotoBusy(false);}
  };
  const removePhoto=async()=>{
    if(receipt)return;
    if(!photoRef){setSelectedPhoto(null);setPhotoConsent(false);setPhotoMessage("");return;}
    if(photoBusy)return;
    setPhotoBusy(true);setPhotoError("");setPhotoMessage("");
    try{
      const response=await fetch("/api/staff/photo/delete",{
        method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({photoId:photoRef,kind}),cache:"no-store"
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||"Could not remove the private draft.");
      setSelectedPhoto(null);setPhotoRef(null);setPhotoExpiresAt("");setPhotoConsent(false);
      setPhotoMessage("Photo removed from your private Drive draft.");
    }catch(e){setPhotoError(e instanceof Error?e.message:"Could not remove photo");}
    finally{setPhotoBusy(false);}
  };
  type Receipt={recordId:string;kind:Kind;number:string;studentName:string;mobile:string;
    pdfReady:boolean;pdfUrl:string|null;sheetStatus:string;documentStatus:string;notice?:string};
  const [termsAccepted,setTermsAccepted]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [submitError,setSubmitError]=useState("");
  const [receipt,setReceipt]=useState<Receipt|null>(null);
  const [pdfBusy,setPdfBusy]=useState(false);
  const [shareFile,setShareFile]=useState<File|null>(null);
  const [shareLoading,setShareLoading]=useState(false);
  const [recipientNumber,setRecipientNumber]=useState("");
  const whatsappMessage=receipt
    ? "Dear "+receipt.studentName+",\n\n"+
      "Your "+(receipt.kind==="admission"?"admission application":"ECCE Scholarship registration")+
      " form has been successfully recorded with *Nitya Academy, Bharatpur*.\n\n"+
      "*Student Name:* "+receipt.studentName+"\n"+
      (receipt.kind==="admission"?"*Application Number:* ":"*Registration Number:* ")+receipt.number+"\n"+
      (receipt.kind==="admission"?"*Course:* "+(values.courseName||config.courses?.find(c=>c.id===values.course)?.name||"Selected Course")+"\n":"")+
      "*Status:* Form submitted\n\n"+
      "Please keep your form number and PDF safely for future reference. "+
      "This acknowledgement does not confirm final admission, scholarship selection or payment.\n\n"+
      "*NITYA ACADEMY, BHARATPUR*\n"+
      "Near Ketan Gate, Sahyog Nagar, Bharatpur 321001\n"+
      "Contact: +91 9680008384 | +91 9802813444\n"+
      "Future yahin se shuru hota hai..."
    :"";
  const submissionAction=async(retry=false)=>{
    if(submitting||!config.submissionsEnabled)return;
    if(!retry&&(!photoRef||!photoConsent||!termsAccepted)){
      setSubmitError("Upload a private photo and accept Student/Guardian Consent and Terms.");
      return;
    }
    setSubmitting(true);setSubmitError("");
    try{
      const url=retry?"/api/staff/application/retry":"/api/staff/application/submit";
      const payload=retry?{recordId:receipt?.recordId}:{
        kind,photoId:photoRef,termsAccepted:true,fields:kind==="scholarship"?{...values,passed12:"yes"}:values
      };
      const response=await fetch(url,{method:"POST",credentials:"include",
        headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(data.error||"Unable to save the application");
      if(!data.recordId||!data.number)throw Error("Server did not return a registration receipt");
      setReceipt(data as Receipt);
    }catch(e){setSubmitError(e instanceof Error?e.message:"Form submission failed");}
    finally{setSubmitting(false);}
  };
  const downloadPdf=async()=>{
    if(!receipt||!receipt.pdfReady||pdfBusy)return;
    setPdfBusy(true);setSubmitError("");
    try{await downloadStaffPdf(receipt.recordId,receipt.number);}
    catch(e){setSubmitError(e instanceof Error?e.message:"Could not download PDF");}
    finally{setPdfBusy(false);}
  };
  const preparePdfShare=async()=>{
    if(!receipt||!receipt.pdfReady||shareLoading)return;
    setShareLoading(true);setSubmitError("");
    try{setShareFile(await fetchStaffPdfFile(receipt.recordId,receipt.number));}
    catch(e){setSubmitError(e instanceof Error?e.message:"Could not prepare PDF for sharing.");}
    finally{setShareLoading(false);}
  };
  const sharePdfWithMessage=()=>{
    if(!shareFile||!receipt)return;
    // Must be invoked directly in the click: navigator.share needs user activation.
    void sharePreparedStaffPdf(shareFile,whatsappMessage).catch(e=>{
      if(e?.name!=="AbortError")
       setSubmitError("Unable to share PDF and message together on this device. Download the PDF, open WhatsApp, then attach it manually.");
    });
  };
  useEffect(()=>{setShareFile(null);},[receipt?.recordId]);
  // The WhatsApp deep link must open synchronously from the user click.
  // Awaiting PDF fetch first causes popup blockers in desktop browsers.
  // WhatsApp links can prefill text, but cannot attach a private PDF file.
  const openWhatsApp=()=>{
    if(!receipt)return;
    const recipient=(recipientNumber||values.whatsapp||values.mobile||receipt.mobile||"").replace(/\D/g,"");
    if(!/^[6-9][0-9]{9}$/.test(recipient)){
      setSubmitError("Enter a valid 10-digit Indian WhatsApp number to open the prepared message.");
      return;
    }
    setSubmitError("");
    const url="https://wa.me/91"+recipient+"?text="+encodeURIComponent(whatsappMessage);
    window.open(url,"_blank","noopener,noreferrer");
  };
  const error=submitError;

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
  // A complete form may submit only when the backend has independently passed security checks and enabled submissions.
  return <form onSubmit={event=>{event.preventDefault();void submissionAction();}} className="rounded-2xl bg-white border p-5 md:p-8 space-y-6">
    <div>
      <h2 className="text-2xl font-bold">{kind === "admission" ? "Student Admission" : "ECCE Scholarship"} Form</h2>
      <p className="text-sm text-slate-600 mt-2">Staff Reference: <strong>{staff.name} ({staff.id})</strong> — verified by server</p>
      <p className="text-sm text-red-700 mt-2 font-semibold">
        {config.submissionsEnabled
          ? "Check student's identity and consent carefully. Only submit correct details; you will receive a unique application/registration number."
          : config.photoStorageEnabled
            ? "Testing only: do not enter real student Aadhaar or other personal details until Final Submit is approved. Photos are temporary private drafts."
            : "Demo only: do not enter real student Aadhaar, phone or address. The selected photo stays in your browser."}
      </p>
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
    <section className="space-y-3 rounded-xl bg-slate-50 border p-4 sm:p-5">
      <h3 className="text-lg font-semibold flex items-center gap-2"><ImageUp size={20}/> Student Photo</h3>
      <p className="text-sm text-slate-600">JPG/PNG only, maximum 2.5 MB. Photos are never publicly shared. A photo draft is not an admission.</p>
      <input type="file" name="photo" accept="image/jpeg,image/png"
        disabled={photoBusy||!!photoRef}
        onChange={e=>{choosePhoto(e.currentTarget.files?.[0]||null);e.currentTarget.value="";}}
        className="block w-full rounded-lg border border-slate-300 bg-white p-3 text-sm disabled:opacity-50"/>
      {photoPreview&&<div className="flex items-center gap-4 flex-wrap">
        <img src={photoPreview} alt="Photo preview (only on this device)"
          className="h-36 w-32 rounded-lg object-cover border border-slate-300 bg-white"/>
        <div className="space-y-1">
          <p className="text-sm font-medium">{selectedPhoto?.name||"Selected photo"}</p>
          <p className="text-xs text-slate-500">{selectedPhoto?Math.ceil(selectedPhoto.size/1024)+" KB":""}</p>
          {photoRef?<p className="text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 size={16}/> Private Drive draft uploaded
          </p>:<p className="text-sm text-blue-700">Local preview only — not yet uploaded</p>}
        </div>
      </div>}
      {selectedPhoto&&config.photoStorageEnabled&&!photoRef&&<>
        <label className="flex gap-2 text-sm items-start">
          <input type="checkbox" className="mt-1" checked={photoConsent}
            onChange={e=>setPhotoConsent(e.target.checked)}/>
          I confirm the student or guardian has consented to this private photo upload.
        </label>
        <button type="button" disabled={photoBusy||!photoConsent}
          onClick={()=>void uploadPhoto()} className="pill-btn-primary disabled:opacity-40">
          <ImageUp size={16} className="mr-2"/>{photoBusy?"Uploading...":"Upload Photo to Private Google Drive"}
        </button>
      </>}
      {selectedPhoto&&!photoRef&&!config.photoStorageEnabled&&<p className="text-sm text-amber-800">
        Private Drive upload is not enabled yet. This image stays only in your browser until you close this preview.
      </p>}
      {photoRef&&<p className="text-xs text-slate-600 flex items-center gap-2">
        <ShieldCheck size={16}/> {receipt?(receipt.pdfReady?"Photo securely attached to submitted form "+receipt.number+".":"Form recorded; photo finalization is pending. Use Retry PDF / Sheet Processing."):"Staff-owned private draft. Expires "+(photoExpiresAt?new Date(photoExpiresAt).toLocaleString("en-IN"):"within 48 hours")+". It is not yet linked to a submitted form."}
      </p>}
      {selectedPhoto&&!receipt&&<button type="button" disabled={photoBusy}
        onClick={()=>void removePhoto()}
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-red-700 disabled:opacity-50">
        <Trash2 size={16}/>{photoRef?"Remove Private Draft":"Clear Selected Photo"}
      </button>}
      {photoError&&<p role="alert" className="text-sm text-red-700 rounded-lg bg-red-50 p-3">{photoError}</p>}
      {photoMessage&&!receipt&&<p role="status" className="text-sm text-green-800 rounded-lg bg-green-50 p-3">{photoMessage}</p>}
      {!receipt&&<p className="text-xs text-slate-500">Unused private photo drafts expire after 48 hours. Remove unused photos with the button above.</p>}
    </section>
    {terms&&<p className="text-sm text-slate-600 whitespace-pre-wrap p-4 bg-slate-50 rounded-xl">{terms}</p>}
    <label className="flex gap-2 text-sm items-start">
      <input required type="checkbox" className="mt-1" checked={termsAccepted}
        disabled={!!receipt} onChange={e=>setTermsAccepted(e.target.checked)}/>
      I confirm that student or guardian has consented and the Terms & Conditions are accepted.
    </label>
    {error&&<p role="alert" className="text-sm text-red-700 flex gap-2"><AlertCircle size={17}/>{error}</p>}
    {receipt&&<div className="rounded-xl border border-green-300 bg-green-50 p-4 space-y-3">
      <p className="font-bold text-green-900">Form Recorded — {receipt.number}</p>
      <p className="text-sm">Student: <strong>{receipt.studentName}</strong></p>
      <p className="text-sm">PDF: <strong>{receipt.pdfReady?"Ready":"Processing — Retry Required"}</strong></p>
      <p className="text-sm">Google Sheet: <strong>{receipt.sheetStatus==="synced"?"Synced":"Pending — Retry Required"}</strong></p>
      {receipt.notice&&<p className="text-sm text-amber-900">{receipt.notice}</p>}
      <label className="block text-sm">WhatsApp recipient (10-digit mobile; optional override)
        <input type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10}
          value={recipientNumber} onChange={e=>setRecipientNumber(e.target.value.replace(/\D/g,"").slice(0,10))}
          placeholder={values.whatsapp||values.mobile||receipt.mobile}
          className="mt-1 block rounded-lg border bg-white px-3 py-2 w-full sm:max-w-xs"/>
      </label>
      <div className="flex flex-wrap gap-2">
        {receipt.pdfReady&&receipt.pdfUrl&&<button type="button" onClick={()=>void downloadPdf()}
          disabled={pdfBusy} className="border rounded-lg px-3 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50">
          <Download size={16}/>{pdfBusy?"Downloading PDF...":"Download PDF"}
        </button>}
        {receipt.pdfReady&&!shareFile&&<button type="button" onClick={()=>void preparePdfShare()}
          disabled={shareLoading} className="border rounded-lg px-3 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50">
          <MessageCircle size={16}/>{shareLoading?"Preparing PDF...":"Prepare PDF + Message Share"}
        </button>}
        {receipt.pdfReady&&shareFile&&canShareStaffPdf(shareFile)&&<button type="button" onClick={sharePdfWithMessage}
          className="border rounded-lg px-3 py-2 text-sm inline-flex items-center gap-2">
          <MessageCircle size={16}/> Share PDF + English Message
        </button>}
        {receipt.pdfReady&&<button type="button" onClick={openWhatsApp}
          className="border rounded-lg px-3 py-2 text-sm inline-flex items-center gap-2">
          <MessageCircle size={16}/> WhatsApp Text (Desktop Fallback)
        </button>}
        {(!receipt.pdfReady||receipt.sheetStatus!=="synced")&&<button type="button"
          disabled={submitting} onClick={()=>void submissionAction(true)}
          className="border rounded-lg px-3 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50">
          <RefreshCcw size={16}/> Retry PDF / Sheet Processing
        </button>}
      </div>
      <p className="text-xs text-slate-600">On supported mobiles: Prepare PDF, then tap Share PDF + English Message, select WhatsApp and choose the recipient. WhatsApp may omit the caption on some devices. On desktop or if Share is unavailable, Download PDF and attach it manually after opening WhatsApp Text. Nothing is sent automatically.</p>
    </div>}
    {!receipt&&<button type="submit"
      disabled={!config.submissionsEnabled||submitting||!photoRef||!photoConsent||!termsAccepted}
      className="pill-btn-primary disabled:opacity-50">
      {config.submissionsEnabled?(submitting?"Submitting...":"Submit Form & Generate PDF"):"Final Submit — Not Enabled"}
    </button>}
  </form>;
}
