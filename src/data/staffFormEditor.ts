/**
 * Shared, validated form-preview schema. No real student submissions are enabled.
 * Sensitive identity requirements, course, consent and scholarship eligibility
 * cannot be removed or weakened through this editor.
 */
export type StaffFormKind="admission"|"scholarship";
export type FieldControl={label:string;visible:boolean;required:boolean};
export type ExtraField={id:string;label:string;type:"text"|"number"|"date"|"select";required:boolean;options:string[]};
export type KindFields={fields:Record<string,FieldControl>;extras:ExtraField[]};
export type FormEditorConfig=Record<StaffFormKind,KindFields>;
export type FieldSpec={key:string;label:string;required:boolean;locked?:boolean;group:string};

const common:FieldSpec[]=[
 {key:"studentName",label:"Student Name",required:true,locked:true,group:"Personal"},
 {key:"fatherName",label:"Father Name",required:true,locked:true,group:"Personal"},
 {key:"motherName",label:"Mother Name",required:false,group:"Personal"},
 {key:"dob",label:"Date of Birth",required:true,locked:true,group:"Personal"},
 {key:"gender",label:"Gender",required:true,locked:true,group:"Personal"},
 {key:"aadhaar",label:"Aadhaar Number (12 Digits)",required:true,locked:true,group:"Personal"},
 {key:"mobile",label:"Mobile Number",required:true,locked:true,group:"Personal"},
 {key:"whatsapp",label:"WhatsApp Number",required:false,group:"Personal"},
 {key:"email",label:"Email",required:false,group:"Personal"},
 {key:"address",label:"Full Address",required:true,locked:true,group:"Personal"},
 {key:"city",label:"City / Village",required:false,group:"Personal"},
 {key:"district",label:"District",required:true,locked:true,group:"Personal"},
 {key:"state",label:"State",required:false,group:"Personal"},
 {key:"pin",label:"PIN Code",required:false,group:"Personal"}
];
export const STAFF_FORM_FIELD_SPECS:Record<StaffFormKind,FieldSpec[]>={
 admission:[
  ...common,
  {key:"passed10",label:"10th Passed?",required:true,locked:true,group:"Education"},
  {key:"board10",label:"10th Board",required:true,group:"Education"},
  {key:"year10",label:"10th Passing Year",required:true,group:"Education"},
  {key:"percent10",label:"10th Percentage",required:false,group:"Education"},
  {key:"passed12",label:"12th Passed?",required:true,locked:true,group:"Education"},
  {key:"board12",label:"12th Board",required:true,group:"Education"},
  {key:"year12",label:"12th Passing Year",required:true,group:"Education"},
  {key:"percent12",label:"12th Percentage",required:false,group:"Education"},
  {key:"lastQualification",label:"Last Qualification",required:false,group:"Education"},
  {key:"lastBoard",label:"Last Qualification Board / University",required:false,group:"Education"},
  {key:"lastYear",label:"Last Qualification Passing Year",required:false,group:"Education"},
  {key:"lastPercent",label:"Last Qualification Percentage",required:false,group:"Education"},
  {key:"course",label:"Select Course",required:true,locked:true,group:"Course / Fees"},
  {key:"session",label:"Session",required:false,group:"Course / Fees"},
  {key:"totalFees",label:"Total Fees (₹)",required:true,locked:true,group:"Course / Fees"},
  {key:"practicalApplicable",label:"Practical Fees Applicable?",required:false,group:"Course / Fees"},
  {key:"practicalFee",label:"Practical Fee Amount (₹)",required:false,group:"Course / Fees"},
  {key:"hasReference",label:"External Reference?",required:false,group:"Course / Fees"},
  {key:"referenceName",label:"Reference Name",required:false,group:"Course / Fees"}
 ],
 scholarship:[
  ...common,
  {key:"year12",label:"12th Passing Year",required:true,locked:true,group:"Education"},
  {key:"lastQualification",label:"Last Qualification",required:true,locked:true,group:"Education"},
  {key:"examDate",label:"Exam Date (Optional)",required:false,group:"Scholarship"},
  {key:"paymentMode",label:"Payment Mode",required:true,locked:true,group:"Scholarship"},
  {key:"transactionRef",label:"Transaction Reference (Optional)",required:false,group:"Scholarship"}
 ]
};

export function defaultFormEditor():FormEditorConfig{
 const make=(kind:StaffFormKind):KindFields=>({
  fields:Object.fromEntries(STAFF_FORM_FIELD_SPECS[kind].map(f=>[f.key,{
    label:f.label,required:f.required,visible:true
  }])),extras:[]
 });
 return {admission:make("admission"),scholarship:make("scholarship")};
}
function isRecord(value:unknown):value is Record<string,unknown>{
 return typeof value==="object" && value!==null && !Array.isArray(value);
}
export function sanitizeFormEditor(value:unknown):FormEditorConfig{
 const defaults=defaultFormEditor();
 if(!isRecord(value))return defaults;
 for(const kind of ["admission","scholarship"] as const){
  const group=isRecord(value[kind])?value[kind]:{};
  const inputFields=isRecord(group.fields)?group.fields:{};
  for(const spec of STAFF_FORM_FIELD_SPECS[kind]){
   const row=isRecord(inputFields[spec.key])?inputFields[spec.key]:{};
   const label=typeof row.label==="string"?row.label.trim():spec.label;
   if(label.length>95||label.length<1)throw new Error("Each field label must be 1–95 characters");
   const visible=spec.locked?true:typeof row.visible==="boolean"?row.visible:true;
   const required=spec.locked?true:typeof row.required==="boolean"?row.required:spec.required;
   defaults[kind].fields[spec.key]={label,visible,required:visible&&required};
  }
  const extras=group.extras===undefined?[]:group.extras;
  if(!Array.isArray(extras)||extras.length>12)throw new Error("Maximum 12 custom fields per form");
  const seen=new Set<string>();
  defaults[kind].extras=extras.map((item:unknown)=>{
   if(!isRecord(item))throw new Error("Invalid additional field");
   const id=item.id,label=item.label,type=item.type,required=item.required;
   if(typeof id!=="string"||!/^custom_[a-z0-9]{6,20}$/.test(id)||seen.has(id))
    throw new Error("Invalid or duplicate custom field ID");
   seen.add(id);
   if(typeof label!=="string"||label.trim().length<1||label.trim().length>95)
    throw new Error("Invalid additional field name");
   if(type!=="text"&&type!=="number"&&type!=="date"&&type!=="select")
    throw new Error("Invalid additional field input type");
   if(typeof required!=="boolean")throw new Error("Invalid additional field requirement");
   const inputOptions=type==="select"?item.options:[];
   if(!Array.isArray(inputOptions)||inputOptions.length>15)
    throw new Error("Dropdown may have at most 15 options");
   const options=inputOptions.map((o:unknown)=>{
    if(typeof o!=="string"||o.trim().length<1||o.trim().length>80)
     throw new Error("Dropdown options must be 1–80 characters");
    return o.trim();
   });
   if(type==="select"&&options.length<2)throw new Error("Dropdown must have at least 2 options");
   return {id,label:label.trim(),type,required,options};
  });
 }
 return defaults;
}
