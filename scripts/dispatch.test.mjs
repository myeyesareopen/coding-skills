import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'deepseek-executor-test-'));
process.env.CODEX_HOME=path.join(scratch,'codex');
const {validateBatch,conflict,acquireLease,releaseLease,readLeases,reserveAuxiliaries,readAuxiliaries,parseFinal,runBatch,FIXED}=await import('./dispatch.mjs');
const fixture=(id='one')=>{const cwd=path.join(scratch,id);fs.mkdirSync(cwd,{recursive:true});return {id,cwd,readPaths:['input.txt'],writePaths:['output.txt'],exclusiveResources:[],projectContext:'Isolated fixture; no dependencies.',instructions:'Read input and write assigned output only.',acceptance:['Expected output'],checks:[],foregroundOnly:true,timeoutMs:5000};};
let serial=0;
const batch=(tasks,concurrency=1)=>({tasks,concurrency,auxiliaryAgents:0,parallelRationale:'Independent fixtures and output files',outputDir:path.join(scratch,'runs',String(++serial))});

test('reject unsafe concurrency and changed model settings',()=>{
 for(const concurrency of [0,21,1.5])assert.throws(()=>validateBatch(batch([fixture()],concurrency)));
 assert.throws(()=>validateBatch({...batch([fixture()]),auxiliaryAgents:20}));
 assert.throws(()=>validateBatch({...batch([fixture()]),reasoningEffort:'high'}));
 assert.throws(()=>validateBatch(batch([{...fixture(),model:'other'}])));
 assert.throws(()=>validateBatch({...batch([fixture()],2),parallelRationale:''}));
});
test('reject scope escape, glob, dependent batch, duplicate id, logs in owned path',()=>{
 for(const change of [{writePaths:['../escape']},{writePaths:['*.txt']},{dependsOn:['other']},{foregroundOnly:false}])assert.throws(()=>validateBatch(batch([{...fixture(),...change}])));
 assert.throws(()=>validateBatch(batch([fixture(),fixture()],2)));
 const t=fixture();assert.throws(()=>validateBatch({...batch([t]),outputDir:path.join(t.cwd,'output.txt','logs')}));
});
test('detect read/write, directory and shared resource conflicts; allow common read-only input',()=>{
 const a=fixture('shared');const b={...a,id:'two',writePaths:['b.txt']};
 assert.doesNotThrow(()=>validateBatch(batch([a,b],2)));
 assert.throws(()=>validateBatch(batch([a,{...b,readPaths:['output.txt']}],2)));
 assert.throws(()=>validateBatch(batch([{...a,writePaths:['src']},{...b,writePaths:['src/a.ts']}],2)));
 assert.throws(()=>validateBatch(batch([{...a,exclusiveResources:['db']},{...b,exclusiveResources:['db']}],2)));
});
test('simultaneous callers never acquire more than 20 slots',async()=>{
 const root=path.join(scratch,'slots-cap');const tasks=Array.from({length:25},(_,i)=>validateBatch(batch([fixture('cap-'+i)])).tasks[0]);
 const leases=await Promise.all(tasks.map(t=>acquireLease(t,root)));assert.equal(leases.filter(Boolean).length,20);assert.equal(readLeases(root).length,20);
 for(const l of leases.filter(Boolean))await releaseLease(l,root);assert.equal(readLeases(root).length,0);
});
test('cross-owner auxiliary reservations and active ownership limit new leases',async()=>{
 const root=path.join(scratch,'slots-aux');fs.mkdirSync(root);await reserveAuxiliaries('other',3,root);await reserveAuxiliaries('current',2,root);
 const old=validateBatch(batch([fixture('old-owner')])).tasks[0];
 fs.writeFileSync(path.join(root,'slot-0.json'),JSON.stringify({...old,slot:0,nonce:'old',ownerPid:-123,auxiliaryAgents:3}));
 const leases=[];for(let i=0;i<20;i++){const l=await acquireLease(validateBatch(batch([fixture('aux-'+i)])).tasks[0],root);if(l)leases.push(l);}
 assert.equal(leases.length,14); // 1 existing +14 new +3 other auxiliaries +2 current auxiliaries =20
 assert.equal(await acquireLease(old,root),null);
 for(const l of leases)await releaseLease(l,root);
});
test('a stale/unconfirmed lease is retained rather than automatically stolen',async()=>{
 const root=path.join(scratch,'slots-stale');const t=validateBatch(batch([fixture('stale')])).tasks[0];
 const lease=await acquireLease(t,root);assert.equal(await acquireLease(t,root),null);
 await assert.rejects(releaseLease({...lease,nonce:'wrong'},root));assert.equal(readLeases(root).length,1);await releaseLease(lease,root);
});
test('auxiliary reservation survives the last worker until explicitly released',async()=>{
 const root=path.join(scratch,'aux-lifecycle');await reserveAuxiliaries('reviewer',1,root);
 const first=await acquireLease(validateBatch(batch([fixture('first-review')])).tasks[0],root);await releaseLease(first,root);
 assert.equal(readAuxiliaries(root)[0].count,1);
 const leases=[];for(let i=0;i<20;i++){const l=await acquireLease(validateBatch(batch([fixture('later-'+i)])).tasks[0],root);if(l)leases.push(l);}
 assert.equal(leases.length,19);await assert.rejects(reserveAuxiliaries('other-reviewer',1,root));
 await reserveAuxiliaries('reviewer',0,root);const last=await acquireLease(validateBatch(batch([fixture('last-slot')])).tasks[0],root);assert(last);
 for(const l of [...leases,last])await releaseLease(l,root);
});
test('accept receipt/idle only with completed turn and structured final result',()=>{
 const text=JSON.stringify({status:'done',changed_files:[],checks:[],blockers:[]});
 assert.equal(parseFinal(text,'completed').status,'done');
 for(const reason of [undefined,'max-tokens','cancelled'])assert.equal(parseFinal(text,reason).status,'incomplete');
 assert.equal(parseFinal('all good','completed').status,'incomplete');
});

const pkg=path.join(scratch,'fake-dsh');fs.mkdirSync(path.join(pkg,'lib'),{recursive:true});
fs.writeFileSync(path.join(pkg,'package.json'),'{}');
fs.writeFileSync(path.join(pkg,'lib','bin.js'),String.raw`
const fs=require('fs');const readline=require('readline');
const send=x=>process.stdout.write(JSON.stringify(x)+'\n');
const reply=(id,result={})=>send({jsonrpc:'2.0',id,result});
const status=status=>send({method:'session.status',params:{status}});
const event=(type,data)=>send({method:'session.event',params:{event:{type,data}}});
let cwd='';
readline.createInterface({input:process.stdin}).on('line',line=>{
 const m=JSON.parse(line);
 if(m.method==='initialize'){cwd=m.params.cwd;if(cwd.includes('timeout-fixture'))return;reply(m.id,{serverInfo:{name:'fake'}});}
 if(m.method==='session/prompt'){
  fs.writeFileSync(require('path').join(cwd,'received.txt'),'yes');reply(m.id,{messageId:'accepted'});status('running');
  setTimeout(()=>{event('assistant/message',{usage:{inputTokens:10,cacheReadTokens:20,outputTokens:30,reasoningTokens:5,totalTokens:60},message:{content:[{type:'text',text:JSON.stringify({status:'done',changed_files:[],checks:[],blockers:[]})}]}});event('turn/end',{reason:{kind:cwd.includes('truncated-fixture')?'max-tokens':'completed'}});status('idle');},250);
 }
 if(m.method==='shutdown'){reply(m.id);setTimeout(()=>process.exit(0),20);}
});
`);
test('two independent fake runtimes finish concurrently, use fixed params and release leases',async()=>{
 const b=validateBatch(batch([fixture('parallel-a'),fixture('parallel-b')],2));
 const result=await runBatch(b,{pkg,key:'test-only-key'});assert.equal(result.status,'done');assert.equal(result.peakConcurrency,2);
 assert.deepEqual(result.parameters,FIXED);assert.equal(readLeases().length,0);
 assert(result.results.every(r=>r.usage.totalTokens===60));
 await assert.rejects(runBatch(b,{pkg,key:'test-only-key'}),/EEXIST/);
});
test('truncation stops queued work and is not reported as success',async()=>{
 const b=validateBatch(batch([fixture('truncated-fixture'),fixture('queued-fixture')]));
 const result=await runBatch(b,{pkg,key:'test-only-key'});assert.equal(result.status,'needs_attention');assert.equal(result.results[0].status,'incomplete');assert.deepEqual(result.notStarted,['queued-fixture']);
 assert(!fs.existsSync(path.join(b.tasks[1].cwd,'received.txt')));assert.equal(readLeases().length,0);
});
test('timeout cancels initialization promptly and sends no prompt',async()=>{
 const b=validateBatch(batch([{...fixture('timeout-fixture'),timeoutMs:1000}]));const start=Date.now();
 const result=await runBatch(b,{pkg,key:'test-only-key'});assert(Date.now()-start<6000);assert.equal(result.results[0].status,'failed');
 assert(!fs.existsSync(path.join(b.tasks[0].cwd,'received.txt')));assert.equal(readLeases().length,0);
});
