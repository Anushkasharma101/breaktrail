import { DatabaseSync } from 'node:sqlite';
import { mkdirSync,readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { defaultPrefs,placeSchema } from './schemas.js';
const seed=JSON.parse(readFileSync(new URL('./data/places.json',import.meta.url),'utf8')).map(p=>placeSchema.parse(p));
export function openDatabase(filename){if(filename!==':memory:')mkdirSync(path.dirname(filename),{recursive:true});const db=new DatabaseSync(filename);db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS places(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS preferences(id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS plans(id TEXT PRIMARY KEY,payload TEXT NOT NULL,saved INTEGER NOT NULL DEFAULT 0 CHECK(saved IN (0,1)),created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS history(id TEXT PRIMARY KEY,payload TEXT NOT NULL,completed_at TEXT NOT NULL);
 PRAGMA user_version=1;`);db.prepare('INSERT OR IGNORE INTO preferences(id,payload) VALUES(1,?)').run(JSON.stringify(defaultPrefs));const put=db.prepare('INSERT OR IGNORE INTO places(id,payload) VALUES(?,?)');for(const p of seed)put.run(p.id,JSON.stringify(p));return db}
export function createStore(db){const json=row=>row?JSON.parse(row.payload):null;const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value}catch(e){db.exec('ROLLBACK');throw e}};const store={
 places:()=>db.prepare('SELECT payload FROM places ORDER BY id').all().map(json),
 place:id=>json(db.prepare('SELECT payload FROM places WHERE id=?').get(id)),
 preferences:()=>json(db.prepare('SELECT payload FROM preferences WHERE id=1').get()),
 setPreferences:p=>{db.prepare('UPDATE preferences SET payload=? WHERE id=1').run(JSON.stringify(p));return p},
 upsertPlan:(plan,saved=false)=>{db.prepare('INSERT INTO plans(id,payload,saved,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,saved=MAX(plans.saved,excluded.saved)').run(plan.id,JSON.stringify(plan),saved?1:0,plan.createdAt||new Date().toISOString());return plan},
 plan:id=>json(db.prepare('SELECT payload FROM plans WHERE id=?').get(id)),
 savedPlans:()=>db.prepare('SELECT payload FROM plans WHERE saved=1 ORDER BY created_at DESC,id').all().map(json),
 deleteSaved:id=>db.prepare('UPDATE plans SET saved=0 WHERE id=?').run(id),
 addHistory:entry=>{const id=createHash('sha256').update(`${entry.plan.id}:${entry.completedAt}`).digest('hex');db.prepare('INSERT INTO history(id,payload,completed_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(id,JSON.stringify(entry),entry.completedAt);return {...entry,id}},
 history:()=>db.prepare('SELECT id,payload FROM history ORDER BY completed_at DESC,id').all().map(row=>({id:row.id,...json(row)})),
 deleteHistory:id=>db.prepare('DELETE FROM history WHERE id=?').run(id),
 clear:()=>transaction(()=>{db.exec('DELETE FROM history; DELETE FROM plans;');store.setPreferences(defaultPrefs)}),
 replaceState:state=>transaction(()=>{db.exec('DELETE FROM history; UPDATE plans SET saved=0;');store.setPreferences(state.preferences);for(const p of state.plans)store.upsertPlan(p,true);for(const h of state.history)store.addHistory(h);return store.snapshot()}),
 snapshot:()=>({preferences:store.preferences(),plans:store.savedPlans(),history:store.history()}),
 updateSeed:()=>transaction(()=>{for(const p of seed)db.prepare('INSERT INTO places(id,payload) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(p.id,JSON.stringify(p));return seed.length}),
 close:()=>db.close()
 };return store}
