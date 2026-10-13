/**
 * Authenticated private PDF download over POST.
 * A GET navigation to /api/staff/pdf/:id may be served the site's SPA
 * 404 by Cloudflare Workers static-asset routing; POST reaches Worker code.
 * Never expose Google Drive links, Student IDs in query strings or cache data.
 */
export async function downloadStaffPdf(recordId:string,formNumber:string):Promise<void>{
 const response=await fetch("/api/staff/application/pdf-download",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  credentials:"include",
  cache:"no-store",
  body:JSON.stringify({recordId})
 });
 if(!response.ok){
  const data=await response.json().catch(()=>({}));
  if(response.status===401)throw Error("Staff login expired. Please log in again and retry PDF Download.");
  throw Error(data.error||"PDF Download failed. Please try again.");
 }
 if(!(response.headers.get("Content-Type")||"").toLowerCase().includes("application/pdf"))
  throw Error("Server returned an unexpected PDF response. Please contact Admin.");
 const pdf=await response.blob();
 if(pdf.size<500||pdf.size>8000000)throw Error("PDF is empty or exceeds the allowed size.");
 const safeNumber=formNumber.replace(/[^A-Za-z0-9_-]/g,"");
 const objectUrl=URL.createObjectURL(pdf);
 try{
  const anchor=document.createElement("a");
  anchor.href=objectUrl;
  anchor.download="Nitya-Academy-"+safeNumber+".pdf";
  anchor.style.display="none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
 }finally{
  // Give slower browsers time to finish consuming the object URL.
  window.setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);
 }
}
