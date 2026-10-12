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


/**
 * Read-only bridge diagnostic. No student information, files, or changes.
 * An intentionally invalid logo ID confirms the currently deployed Apps Script
 * understands the V2 action and validates the shared secret.
 * This does NOT itself validate that DriveApp has been authorized.
 */
export async function probeDriveBridge(env:DriveBridgeEnv):Promise<{
  connected:boolean;code:string;message:string;
}> {
 if(!driveReady(env))return {
  connected:false,code:"MISSING_CONFIG",
  message:"Apps Script URL or secret is not configured for this Preview."
 };
 let url:URL;
 try{
  url=new URL(env.STAFF_SHEETS_URL!);
  if(url.protocol!=="https:"||url.hostname!=="script.google.com"||
     !/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname))throw Error("invalid URL");
 }catch{return {connected:false,code:"INVALID_URL",message:"Apps Script deployment URL is invalid."};}
 let response:Response;
 try{
  response=await fetch(url.toString(),{
   method:"POST",
   headers:{"Content-Type":"text/plain;charset=utf-8"},
   body:JSON.stringify({action:"getCourseLogo",fileId:"probe-invalid-id",secret:env.STAFF_SHEETS_SECRET}),
   redirect:"follow",
   signal:AbortSignal.timeout(12000)
  });
 }catch(e){
  console.error("Staff Google Apps Script diagnostic transport failed",e);
  return {connected:false,code:"NETWORK_FAILURE",message:"Google Apps Script could not be reached. Check deployment access."};
 }
 if(!response.ok)return {
  connected:false,code:"HTTP_ERROR",
  message:"Google Apps Script returned HTTP "+response.status+". Check Web App access permissions."
 };
 let result:Record<string,unknown>;
 try{
  const payload=await response.text();
  result=JSON.parse(payload) as Record<string,unknown>;
 }catch{return {
  connected:false,code:"NON_JSON_RESPONSE",
  message:"Apps Script did not return JSON. Check Web App deployment and permissions."
 };}
 const reason=String(result.error||"");
 if(result.success===false && reason==="Invalid logo id")return {
  connected:true,code:"V2_ENDPOINT_OK",
  message:"Google Apps Script V2 and shared secret are working. Drive permissions still require testing."
 };
 if(/unauthorized/i.test(reason))return {
  connected:false,code:"SECRET_MISMATCH",
  message:"Apps Script rejected the secret. Confirm its Script Property matches the Preview secret."
 };
 if(/unsupported operation/i.test(reason))return {
  connected:false,code:"OLD_DEPLOYMENT",
  message:"This Web App is running old Apps Script code. Redeploy the existing V2 deployment."
 };
 if(/permission|authorization|access denied|scope|not authorized/i.test(reason))return {
  connected:false,code:"APPS_SCRIPT_PERMISSION",
  message:"Apps Script needs Drive authorization or access permissions."
 };
 console.error("Staff Google Apps Script diagnostic unexpected response",{
  success:result.success,hasError:!!reason
 });
 return {connected:false,code:"SCRIPT_ERROR",
   message:"Apps Script returned an unexpected response. Check Apps Script Executions for details."};
}
