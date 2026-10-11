import { describe,it,expect } from 'vitest';
import { createDemoPlan,formatTime,remainingSeconds } from './planner';
import { defaultPreferences,planSchema,planFileSchema,backupSchema,initialState } from './schemas';
describe('plan and offline data validation',()=>{
 it('keeps travel and activity inside the available time',()=>{for(const mood of ['Quiet','Nature','Movement','Discovery'] as const)for(const minutes of [10,20,30,45]){const p=createDemoPlan({...defaultPreferences,mood,minutes});expect(p).not.toBeNull();expect(p!.walk*2).toBeLessThan(p!.minutes);expect(p!.minutes).toBe(minutes);expect(p!.source).toBe('demo')}});
 it('rejects a plan with no time left for its mission',()=>{const p=createDemoPlan(defaultPreferences)!;expect(planSchema.safeParse({...p,walk:10,minutes:20}).success).toBe(false)});
 it('rejects malformed imports and unknown formats',()=>{expect(planFileSchema.safeParse({schema:'other',plan:{}}).success).toBe(false);expect(planSchema.safeParse({name:'Garden',minutes:-1}).success).toBe(false)});
 it('round trips a valid plan and backup',()=>{const p=createDemoPlan(defaultPreferences)!;expect(planFileSchema.parse(JSON.parse(JSON.stringify({schema:'breaktrail-plan-v1',plan:p}))).plan.id).toBe(p.id);expect(backupSchema.parse({schema:'breaktrail-backup-v2',data:{...initialState,plans:[p]}}).data.plans).toHaveLength(1)});
});
describe('timestamp timer',()=>{it('catches up after the page has been closed',()=>{expect(remainingSeconds({paused:false,remaining:120,deadline:500000},440000)).toBe(60);expect(remainingSeconds({paused:false,remaining:120,deadline:500000},600000)).toBe(0)});it('does not advance while paused',()=>{expect(remainingSeconds({paused:true,remaining:75,deadline:1},999999)).toBe(75)});it('formats minutes and seconds',()=>{expect(formatTime(125)).toBe('02:05')})});
