import { z } from 'zod';
import { planSchema,preferencesSchema,historySchema } from './schemas';
import type { Preferences } from './schemas';
const endpoint=(base:string,path:string)=>`${base.replace(/\/$/,'')}/${path}`;
export class ApiError extends Error{constructor(message:string,public code='API_ERROR',public status=500){super(message)}}
export async function apiRequest(base:string,path:string,options:RequestInit={}){if(!base)throw new ApiError('Save a backend URL first.','NO_API');const res=await fetch(endpoint(base,path),{...options,headers:{'Content-Type':'application/json',...options.headers}});if(!res.ok){let payload;try{payload=await res.json()}catch{/* Non-JSON host error. */}throw new ApiError(payload?.error?.message||`Backend returned HTTP ${res.status}.`,payload?.error?.code||'API_ERROR',res.status)}return res.status===204?null:res.json()}
export const ollamaStatusSchema=z.object({available:z.boolean(),model:z.string(),modelInstalled:z.boolean(),ready:z.boolean(),models:z.array(z.string()),error:z.string().nullable()});
export type OllamaStatus=z.infer<typeof ollamaStatusSchema>;
export async function checkHealth(base:string){await apiRequest(base,'health',{signal:AbortSignal.timeout(5000)});return ollamaStatusSchema.parse(await apiRequest(base,'ollama/status',{signal:AbortSignal.timeout(6000)}))}
export async function requestPlan(prefs:Preferences,signal:AbortSignal){const {api,name,...input}=prefs;void name;const payload=await apiRequest(api,'plans',{method:'POST',body:JSON.stringify(input),signal});const parsed=planSchema.parse(payload.plan||payload);if(parsed.minutes>prefs.minutes)throw Error('The returned plan exceeds your available time.');return parsed}
export const serverPreferencesSchema=preferencesSchema.omit({api:true,coordinates:true});
export const serverStateSchema=z.object({preferences:serverPreferencesSchema,plans:z.array(planSchema).max(500),history:z.array(historySchema).max(1000)});
export type ServerState=z.infer<typeof serverStateSchema>;
export async function loadServerState(base:string){return serverStateSchema.parse(await apiRequest(base,'state',{signal:AbortSignal.timeout(10000)}))}
export const placeDetailsSchema=z.object({id:z.string(),name:z.string(),area:z.string(),address:z.string(),description:z.string(),hours:z.string(),hoursVerified:z.boolean(),accessibility:z.string(),verified:z.boolean()});
export type PlaceDetails=z.infer<typeof placeDetailsSchema>;
export async function loadPlace(base:string,id:string,signal:AbortSignal){const payload=await apiRequest(base,'places/'+encodeURIComponent(id),{signal});return placeDetailsSchema.parse(payload.place)}
