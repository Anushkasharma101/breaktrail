import { DatabaseSync } from 'node:sqlite';
import { mkdirSync,readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { defaultPrefs,placeSchema } from './schemas.js';
const seed=JSON.parse(readFileSync(new URL('./data/places.json',import.meta.url),'utf8')).map(p=>placeSchema.parse(p));
export function openDatabase(filename){if(filename!==':memory:')mkdirSync(path.dirname(filename),{recursive:true});const db=new DatabaseSync(filename);db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS places(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS visitor_preferences(owner TEXT PRIMARY KEY, payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS visitor_plans(owner TEXT NOT NULL,id TEXT NOT NULL,payload TEXT NOT NULL,saved INTEGER NOT NULL DEFAULT 0 CHECK(saved IN (0,1)),created_at TEXT NOT NULL,PRIMARY KEY(owner,id));
 CREATE TABLE IF NOT EXISTS visitor_history(owner TEXT NOT NULL,id TEXT NOT NULL,payload TEXT NOT NULL,completed_at TEXT NOT NULL,PRIMARY KEY(owner,id));
 CREATE TABLE IF NOT EXISTS migrations(name TEXT PRIMARY KEY);
 PRAGMA user_version=2;`);// Keep legacy single-profile records private to local mode. Never assign them to public visitors.
if(!db.prepare("SELECT name FROM migrations WHERE name='legacy-local-v2'").get()&&db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='preferences'").get()){
 db.exec(`BEGIN IMMEDIATE; INSERT OR IGNORE INTO visitor_preferences(owner,payload) SELECT 'local',payload FROM preferences;
 INSERT OR IGNORE INTO visitor_plans(owner,id,payload,saved,created_at) SELECT 'local',id,payload,saved,created_at FROM plans;
 INSERT OR IGNORE INTO visitor_history(owner,id,payload,completed_at) SELECT 'local',id,payload,completed_at FROM history;
 INSERT INTO migrations(name) VALUES('legacy-local-v2'); COMMIT;`);
}
const put=db.prepare('INSERT OR IGNORE INTO places(id,payload) VALUES(?,?)');for(const p of seed)put.run(p.id,JSON.stringify(p));return db}
export function createStore(db,owner="local"){db.prepare("INSERT OR IGNORE INTO visitor_preferences(owner,payload) VALUES(?,?)").run(owner,JSON.stringify(defaultPrefs));const json=row=>row?JSON.parse(row.payload):null;const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value}catch(e){db.exec('ROLLBACK');throw e}};const store={
 places:()=>db.prepare('SELECT payload FROM places ORDER BY id').all().map(json),
 place:id=>json(db.prepare('SELECT payload FROM places WHERE id=?').get(id)),
 preferences:()=>json(db.prepare('SELECT payload FROM visitor_preferences WHERE owner=?').get(owner)),
 setPreferences:p=>{db.prepare('UPDATE visitor_preferences SET payload=? WHERE owner=?').run(JSON.stringify(p),owner);return p},
 upsertPlan:(plan,saved=false)=>{db.prepare('INSERT INTO visitor_plans(owner,id,payload,saved,created_at) VALUES(?,?,?,?,?) ON CONFLICT(owner,id) DO UPDATE SET payload=excluded.payload,saved=MAX(visitor_plans.saved,excluded.saved)').run(owner,plan.id,JSON.stringify(plan),saved?1:0,plan.createdAt||new Date().toISOString());return plan},
 plan:id=>json(db.prepare('SELECT payload FROM visitor_plans WHERE owner=? AND id=?').get(owner,id)),
 savedPlans:()=>db.prepare('SELECT payload FROM visitor_plans WHERE owner=? AND saved=1 ORDER BY created_at DESC,id').all(owner).map(json),
 deleteSaved:id=>db.prepare('UPDATE visitor_plans SET saved=0 WHERE owner=? AND id=?').run(owner,id),
 addHistory:entry=>{const id=createHash('sha256').update(`${entry.plan.id}:${entry.completedAt}`).digest('hex');db.prepare('INSERT INTO visitor_history(owner,id,payload,completed_at) VALUES(?,?,?,?) ON CONFLICT(owner,id) DO UPDATE SET payload=excluded.payload').run(owner,id,JSON.stringify(entry),entry.completedAt);return {...entry,id}},
 history:()=>db.prepare('SELECT id,payload FROM visitor_history WHERE owner=? ORDER BY completed_at DESC,id').all(owner).map(row=>({id:row.id,...json(row)})),
 deleteHistory:id=>db.prepare('DELETE FROM visitor_history WHERE owner=? AND id=?').run(owner,id),
 clear:()=>transaction(()=>{db.prepare('DELETE FROM visitor_history WHERE owner=?').run(owner);db.prepare('DELETE FROM visitor_plans WHERE owner=?').run(owner);store.setPreferences(defaultPrefs)}),
 replaceState:state=>transaction(()=>{db.prepare('DELETE FROM visitor_history WHERE owner=?').run(owner);db.prepare('UPDATE visitor_plans SET saved=0 WHERE owner=?').run(owner);store.setPreferences(state.preferences);for(const p of state.plans)store.upsertPlan(p,true);for(const h of state.history)store.addHistory(h);return store.snapshot()}),
 snapshot:()=>({preferences:store.preferences(),plans:store.savedPlans(),history:store.history()}),
 updateSeed:()=>transaction(()=>{for(const p of seed)db.prepare('INSERT INTO places(id,payload) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(p.id,JSON.stringify(p));return seed.length}),
 close:()=>db.close()
 };return store}
