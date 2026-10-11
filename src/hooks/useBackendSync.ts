import { useCallback,useEffect,useRef,useState } from 'react';
import { z } from 'zod';
import { historySchema,planSchema } from '../lib/schemas';
import { apiRequest,serverPreferencesSchema,serverStateSchema } from '../lib/api';
const taskSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('preferences'),preferences:serverPreferencesSchema}),
 z.object({kind:z.literal('savePlan'),plan:planSchema}),
 z.object({kind:z.literal('deletePlan'),id:z.string().min(1).max(100)}),
 z.object({kind:z.literal('history'),entry:historySchema}),
 z.object({kind:z.literal('clear')}),
 z.object({kind:z.literal('replace'),snapshot:serverStateSchema})
]);
export type SyncTask=z.infer<typeof taskSchema>;
const jobSchema=z.object({id:z.string(),base:z.string().max(500).refine(v=>v==='/api'||/^https?:\/\//.test(v)),task:taskSchema});
type Job=z.infer<typeof jobSchema>;
const KEY='breaktrail-outbox-v1';
function loadJobs():Job[]{try{const parsed=z.array(jobSchema).max(200).safeParse(JSON.parse(localStorage.getItem(KEY)||'[]'));return parsed.success?parsed.data:[]}catch{return []}}
export function useBackendSync(base:string){
 const [jobs,setJobs]=useState<Job[]>(loadJobs);const ref=useRef(jobs);const running=useRef(false);const [status,setStatus]=useState<'idle'|'syncing'|'pending'|'synced'>('idle');const [error,setError]=useState('');
 const update=useCallback((next:Job[])=>{ref.current=next;setJobs(next);try{localStorage.setItem(KEY,JSON.stringify(next))}catch{setError('The sync queue could not be stored. Keep this tab open and export important plans.')}},[]);
 const enqueue=useCallback((task:SyncTask,targetBase=base)=>{if(!targetBase)return;if(ref.current.length>=200){setError('200 pending actions. Sync them, then use Save this device to SQLite to capture any remaining changes.');return}update([...ref.current,{id:crypto.randomUUID(),base:targetBase,task:taskSchema.parse(task)}]);setStatus('pending')},[base,update]);
 const flush=useCallback(async()=>{if(!base||running.current)return;const first=ref.current.find(j=>j.base===base);if(!first)return;running.current=true;setStatus('syncing');setError('');try{for(;;){const job=ref.current.find(j=>j.base===base);if(!job)break;let method='POST',path='',body:unknown;switch(job.task.kind){case 'preferences':method='PUT';path='preferences';body=job.task.preferences;break;case 'savePlan':path='saved-plans';body=job.task.plan;break;case 'deletePlan':method='DELETE';path='saved-plans/'+encodeURIComponent(job.task.id);break;case 'history':path='history';body=job.task.entry;break;case 'clear':method='DELETE';path='data';break;case 'replace':method='PUT';path='state';body=job.task.snapshot;break}await apiRequest(job.base,path,{method,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});update(ref.current.filter(v=>v.id!==job.id))}setStatus('synced')}catch(e){setStatus('pending');setError(e instanceof Error?e.message:'Backend sync failed.')}finally{running.current=false}},[base,update]);
 useEffect(()=>{void flush()},[jobs,flush]);
 useEffect(()=>{const online=()=>{void flush()};window.addEventListener('online',online);return()=>window.removeEventListener('online',online)},[flush]);
 const clearAndQueue=()=>{update(base?[{id:crypto.randomUUID(),base,task:{kind:'clear'}}]:[]);setStatus(base?'pending':'idle')};
 return {enqueue,clearAndQueue,retry:flush,status,error,pending:jobs.filter(j=>j.base===base).length,pendingElsewhere:jobs.filter(j=>j.base!==base).length};
}
