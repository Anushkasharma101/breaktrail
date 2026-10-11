import { beforeEach,describe,it,expect,vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App from './App';
import { screenList } from './hooks/useHashRoute';
import { createDemoPlan } from './lib/planner';
import { defaultPreferences,initialState } from './lib/schemas';
vi.mock('virtual:pwa-register/react',()=>({useRegisterSW:()=>({offlineReady:[false,()=>{}],needRefresh:[false,()=>{}],updateServiceWorker:()=>Promise.resolve()})}));
let stored:Record<string,string>={};
beforeEach(()=>{stored={};vi.stubGlobal('location',{hash:''});vi.stubGlobal('navigator',{onLine:true});vi.stubGlobal('localStorage',{getItem:(key:string)=>stored[key]||null,setItem:(key:string,value:string)=>{stored[key]=value}});vi.stubGlobal('window',{addEventListener:()=>{},removeEventListener:()=>{},scrollTo:()=>{}})});
describe('24-screen React frontend',()=>{
 it('renders every screen when the store is empty',()=>{expect(screenList).toHaveLength(24);for(const [route] of screenList){location.hash='#'+route;const html=renderToStaticMarkup(<App/>);expect(html).toContain('BreakTrail');expect(html).not.toContain('undefined')}});
 it('renders populated plan, history and active timer routes',()=>{const plan=createDemoPlan(defaultPreferences)!;stored['breaktrail-react-v2']=JSON.stringify({...initialState,plans:[plan],history:[{plan,completedAt:new Date().toISOString(),feeling:'Calm',observation:'A bird'}],timer:{plan,stage:'outside',duration:900,deadline:Date.now()+900000,remaining:900,paused:false}});for(const route of ['result','place','saved','outdoor','active','history','reflection']){location.hash='#'+route;const html=renderToStaticMarkup(<App/>);expect(html).toContain('BreakTrail');if(['result','saved','outdoor'].includes(route))expect(html).toContain(plan.name)}});
 it('migrates existing saved plans and reflections',()=>{const plan=createDemoPlan(defaultPreferences)!;stored['breaktrail-v1']=JSON.stringify({prefs:defaultPreferences,plans:[plan],history:[{...plan,completedAt:new Date().toISOString(),feeling:'Calm',observation:'A bird'}],timer:null});location.hash='#history';expect(renderToStaticMarkup(<App/>)).toContain('A bird')});
});
