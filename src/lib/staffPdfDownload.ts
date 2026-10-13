/**
 * Staff-only PDF retrieval over authenticated same-origin POST.
 * Drive IDs / public Drive links are never sent to the browser.
 */
export async function fetchStaffPdfFile(recordId:string,formNumber:string):Promise<File>{
 const response=await fetch("/api/staff/application/pdf-download",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  credentials:"include",cache:"no-store",
  body:JSON.stringify({recordId})
 });
 if(!response.ok){
  const data=await response.json().catch(()=>({}));
  if(response.status===401)
    throw Error("Staff login expired. Please log in again and retry.");
  throw Error(data.error||"PDF could not be loaded. Try again.");
 }
 if(!(response.headers.get("Content-Type")||"").toLowerCase().includes("application/pdf"))
  throw Error("The server did not return a PDF. Contact Admin.");
 const blob=await response.blob();
 if(blob.size<500||blob.size>8000000)throw Error("The PDF is empty or too large.");
 const safeNumber=formNumber.replace(/[^A-Za-z0-9_-]/g,"");
 return new File([blob],"Nitya-Academy-"+safeNumber+".pdf",{type:"application/pdf"});
}
export function saveStaffPdfFile(file:File):void{
 const objectUrl=URL.createObjectURL(file);
 try{
  const anchor=document.createElement("a");
  anchor.href=objectUrl;
  anchor.download=file.name;
  anchor.style.display="none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
 }finally{
  window.setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);
 }
}
export async function downloadStaffPdf(recordId:string,formNumber:string):Promise<void>{
 saveStaffPdfFile(await fetchStaffPdfFile(recordId,formNumber));
}
/** Browser native share; unlike wa.me, supports file attachments when browser supports files. */
export function canShareStaffPdf(file:File):boolean{
 try{
  return typeof navigator.share==="function"
   && typeof navigator.canShare==="function"
   && navigator.canShare({files:[file]});
 }catch{return false;}
}
/**
 * Invoke synchronously from a real user click, after the File was prepared.
 * iOS/Android share sheets may offer WhatsApp. Neither recipient selection
 * nor simultaneous attachment+caption delivery can be guaranteed by browsers.
 */
export function sharePreparedStaffPdf(file:File,message:string):Promise<void>{
 if(!canShareStaffPdf(file))
  return Promise.reject(Error("This browser cannot share a PDF file. Download the PDF and attach it in WhatsApp."));
 return navigator.share({files:[file],title:"Nitya Academy Registration",text:message});
}
