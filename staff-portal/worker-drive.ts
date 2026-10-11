/**
 * Server-to-server Google Apps Script bridge. Always use secret from Worker env.
 * No Drive file is shared publicly. Staff/Aadhaar data never enter a query string.
 */
export type DriveBridgeEnv = {
  STAFF_SHEETS_URL?:string;
  STAFF_SHEETS_SECRET?:string;
};
export function driveReady(env:DriveBridgeEnv):boolean {
 return !!env.STAFF_SHEETS_URL && !!env.STAFF_SHEETS_SECRET;
}
export async function driveRequest(env:DriveBridgeEnv,body:Record<string,unknown>){
 if(!env.STAFF_SHEETS_URL||!env.STAFF_SHEETS_SECRET)throw new Error("Google Drive bridge is not configured");
 const url=new URL(env.STAFF_SHEETS_URL);
 if(url.protocol!=="https:"||url.hostname!=="script.google.com"||!url.pathname.startsWith("/macros/s/")||!url.pathname.endsWith("/exec"))
    throw new Error("Invalid Google Apps Script deployment URL");
 const response=await fetch(url.toString(),{
   method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
   body:JSON.stringify({...body,secret:env.STAFF_SHEETS_SECRET}),
   redirect:"follow",
   signal:AbortSignal.timeout(45000)
 });
 if(!response.ok)throw new Error("Google Apps Script HTTP "+response.status);
 const data=await response.json() as Record<string,unknown>;
 if(data.success!==true)throw new Error(typeof data.error==="string"?data.error:"Google Drive rejected request");
 return data;
}
export function toBase64(bytes:Uint8Array):string{
 let out="";
 for(let i=0;i<bytes.length;i+=16384){
   out+=String.fromCharCode(...bytes.subarray(i,i+16384));
 }
 return btoa(out);
}
export function fromBase64(str:string):Uint8Array{
 if(!/^[A-Za-z0-9+/]*={0,2}$/.test(str)||str.length>14000000)throw new Error("Invalid file payload");
 return Uint8Array.from(atob(str),c=>c.charCodeAt(0));
}
