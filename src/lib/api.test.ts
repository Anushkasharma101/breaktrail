import { beforeEach,it,expect,vi } from 'vitest';
import { requestPlan,ApiError } from './api';
import { createDemoPlan } from './planner';
import { defaultPreferences } from './schemas';
beforeEach(()=>vi.restoreAllMocks());
it('keeps backend fallback responses labeled as demo',async()=>{const plan=createDemoPlan(defaultPreferences)!;const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify({plan,meta:{fallback:true}})));vi.stubGlobal('fetch',mock);const result=await requestPlan({...defaultPreferences,api:'/api'},new AbortController().signal);expect(result.source).toBe('demo');const sent=JSON.parse(mock.mock.calls[0][1].body);expect(sent.name).toBeUndefined();expect(sent.api).toBeUndefined()});
it('preserves backend error codes for the correct recovery screen',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{code:'NO_MATCH',message:'No eligible place'}}),{status:422})));await expect(requestPlan({...defaultPreferences,api:'/api'},new AbortController().signal)).rejects.toMatchObject({code:'NO_MATCH',status:422});expect(new ApiError('Failed')).toBeInstanceOf(Error)});
