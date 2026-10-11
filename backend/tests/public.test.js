import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { openDatabase,createStore } from '../src/database.js';
const input={area:'Central Jaipur',minutes:20,mood:'Quiet',budget:'Free',request:''};
test('public visitors cannot read, overwrite or delete another visitor records',async t=>{
 const db=openDatabase(':memory:');t.after(()=>db.close());
 const ollama={status:async()=>({ready:true}),generate:async(_input,p)=>({placeId:p[0].id,activity:'Listen to birds',explanation:'Quiet break'})};
 const app=createApp({store:createStore(db),storeForOwner:owner=>createStore(db,owner),ollama,config:{publicMode:true,origins:['https://breaktrail.example'],model:'qwen3:0.6b'}});
 const a='Bearer '+'a'.repeat(64),b='Bearer '+'b'.repeat(64);
 await request(app).get('/api/state').expect(401);
 await request(app).delete('/api/data').expect(401);
 await request(app).put('/api/preferences').set('Authorization',a).send({...input,name:'Alice'}).expect(200);
 const plan=(await request(app).post('/api/plans').set('Authorization',a).send(input).expect(201)).body.plan;
 await request(app).post('/api/saved-plans').set('Authorization',a).send(plan).expect(201);
 await request(app).get('/api/plans/'+plan.id).set('Authorization',b).expect(404);
 await request(app).post('/api/saved-plans').set('Authorization',b).send({...plan,name:'Bob plan'}).expect(201);
 await request(app).delete('/api/data').set('Authorization',b).expect(204);
 const state=(await request(app).get('/api/state').set('Authorization',a).expect(200)).body;
 assert.equal(state.preferences.name,'Alice');assert.equal(state.plans[0].name,plan.name);
 await request(app).get('/api/health').set('Host','breaktrail.example').expect(200);
 await request(app).get('/api/state').set('Authorization',a).set('Origin','https://evil.example').expect(403);
 const preflight=await request(app).options('/api/state').set('Origin','https://breaktrail.example').set('Access-Control-Request-Method','PUT').set('Access-Control-Request-Headers','authorization,content-type').expect(204);
 assert.match(preflight.headers['access-control-allow-headers'],/Authorization/);
});
test('legacy migration is private and deleted records do not reappear on restart',async()=>{
 const {mkdtempSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const path=await import('node:path');const {DatabaseSync}=await import('node:sqlite');
 const dir=mkdtempSync(path.join(tmpdir(),'breaktrail-legacy-'));const file=path.join(dir,'data.sqlite');
 try{
  let db=new DatabaseSync(file);db.exec('CREATE TABLE preferences(id INTEGER PRIMARY KEY,payload TEXT);CREATE TABLE plans(id TEXT PRIMARY KEY,payload TEXT,saved INTEGER,created_at TEXT);CREATE TABLE history(id TEXT PRIMARY KEY,payload TEXT,completed_at TEXT);');
  const temp=openDatabase(':memory:');const original={...createStore(temp).preferences(),name:'Legacy'};temp.close();
  db.prepare('INSERT INTO preferences VALUES(1,?)').run(JSON.stringify(original));db.prepare('INSERT INTO plans VALUES(?,?,1,?)').run('old',JSON.stringify({id:'old'}),new Date().toISOString());db.close();
  db=openDatabase(file);assert.equal(createStore(db).preferences().name,'Legacy');assert.equal(createStore(db,'visitor').savedPlans().length,0);createStore(db).clear();db.close();
  db=openDatabase(file);assert.equal(createStore(db).savedPlans().length,0);assert.equal(createStore(db).preferences().name,'Explorer');db.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});
