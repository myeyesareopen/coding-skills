import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

export const FIXED = Object.freeze({provider:'deepseek-official',model:'deepseek-flash',reasoningEffort:'max',maxTokens:393216});
export const CAP = 20;
const VERSION='0.1.5-rc.2';
const stateRoot=path.join(process.env.CODEX_HOME || path.join(os.homedir(),'.codex'),'deepseek-executor-state');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const emit=value=>process.stdout.write(JSON.stringify(value)+'\n');
const must=(ok,message)=>{if(!ok)throw Error(message);};
function canonical(value){
 let current=path.resolve(value);const suffix=[];
 while(!fs.existsSync(current)){const parent=path.dirname(current);must(parent!==current,'Cannot resolve path: '+value);suffix.unshift(path.basename(current));current=parent;}
 const resolved=path.join(fs.realpathSync.native(current),...suffix);
 return process.platform==='win32'?resolved.toLowerCase():resolved;
}
const inside=(parent,child)=>{const rel=path.relative(parent,child);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));};
const overlaps=(a,b)=>inside(a,b)||inside(b,a);
export function conflict(a,b){
 return a.writePaths.some(w=>[...b.writePaths,...b.readPaths].some(p=>overlaps(w,p)))
 || b.writePaths.some(w=>a.readPaths.some(p=>overlaps(w,p)))
 || a.exclusiveResources.some(r=>b.exclusiveResources.includes(r));
}
function textList(value,name,allowEmpty=false){must(Array.isArray(value)&&(allowEmpty||value.length>0)&&value.every(v=>typeof v==='string'&&v.trim()),name+' must be a string array');return value;}
export function validateBatch(raw){
 must(raw&&typeof raw==='object','Batch must be an object');
 must(Number.isInteger(raw.concurrency)&&raw.concurrency>=1&&raw.concurrency<=CAP,'concurrency must be 1..20');
 const auxiliaryAgents=raw.auxiliaryAgents??0;
 must(Number.isInteger(auxiliaryAgents)&&auxiliaryAgents>=0&&raw.concurrency+auxiliaryAgents<=CAP,'concurrency + auxiliaryAgents must be <=20');
 if(auxiliaryAgents>0)must(/^[a-z0-9][a-z0-9-]{0,79}$/.test(raw.coordinatorId??''),'coordinatorId required for auxiliary reservations');
 if(raw.concurrency>1)must(typeof raw.parallelRationale==='string'&&raw.parallelRationale.trim(),'parallelRationale is required for concurrency >1');
 must(path.isAbsolute(raw.outputDir??''),'outputDir must be absolute');
 const outputDir=canonical(raw.outputDir);
 must(Array.isArray(raw.tasks)&&raw.tasks.length>0,'tasks must be nonempty');
 const ids=new Set();
 const tasks=raw.tasks.map(t=>{
  must(/^[a-z][a-z0-9-]{0,63}$/.test(t.id??'')&&!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(t.id)&&!ids.has(t.id),'Task IDs must be unique non-reserved lowercase slugs');ids.add(t.id);
  must(path.isAbsolute(t.cwd??'')&&fs.statSync(t.cwd).isDirectory(),'cwd must be an existing absolute directory');
  const cwd=canonical(t.cwd);
  for(const field of ['model','provider','reasoningEffort','maxTokens','profile'])must(!(field in t)&&!(field in raw),'Model/profile overrides are not supported: '+field);
  must(!t.dependsOn?.length,'Run dependent tasks in a later batch after coordinator review/integration');
  const resolveScopes=field=>textList(t[field],field,true).map(p=>{
   must(!path.isAbsolute(p)&&!/[?*]/.test(p),'Scopes must be relative literal file/directory paths, no globs');
   const abs=canonical(path.resolve(cwd,p));must(inside(cwd,abs),'Scope escapes cwd: '+p);
   must(!p.split(/[\\/]/).includes('.git'),'Do not assign .git as a scope');return abs;
  });
  const readPaths=resolveScopes('readPaths'),writePaths=resolveScopes('writePaths');
  must(writePaths.every(p=>!overlaps(p,outputDir)),'outputDir must not overlap writable scopes');
  must(typeof t.instructions==='string'&&t.instructions.trim(),'instructions required');
  must(typeof t.projectContext==='string'&&t.projectContext.trim(),'projectContext required: include project rules and relevant contracts');
  must(t.foregroundOnly===true,'foregroundOnly must be true: no detached tools or persistent background services');
  textList(t.acceptance,'acceptance');textList(t.checks,'checks',true);
  const exclusiveResources=textList(t.exclusiveResources??[],'exclusiveResources',true);
  const timeoutMs=t.timeoutMs??1200000;must(Number.isInteger(timeoutMs)&&timeoutMs>=1000&&timeoutMs<=7200000,'timeoutMs must be 1000..7200000');
  return {...t,cwd,readPaths,writePaths,exclusiveResources,timeoutMs};
 });
 if(raw.concurrency>1)for(let i=0;i<tasks.length;i++)for(let j=i+1;j<tasks.length;j++)must(!conflict(tasks[i],tasks[j]),`Concurrent scopes/resources conflict: ${tasks[i].id} / ${tasks[j].id}; narrow scopes or split batches`);
 return {...raw,outputDir,auxiliaryAgents,tasks};
}

async function mutex(root,fn){
 fs.mkdirSync(root,{recursive:true});const dir=path.join(root,'mutex');const deadline=Date.now()+10000;
 while(true){try{fs.mkdirSync(dir);break;}catch(e){if(e.code!=='EEXIST')throw e;must(Date.now()<deadline,'Lease mutex busy/stale; inspect slots and owner processes before recovery');await delay(100);}}
 try{fs.writeFileSync(path.join(dir,'owner.json'),JSON.stringify({pid:process.pid,time:Date.now()}));return await fn();}
 finally{fs.unlinkSync(path.join(dir,'owner.json'));fs.rmdirSync(dir);}
}
export function readLeases(root=stateRoot){
 if(!fs.existsSync(root))return [];
 return fs.readdirSync(root).filter(n=>/^slot-\d+\.json$/.test(n)).map(n=>({...JSON.parse(fs.readFileSync(path.join(root,n),'utf8')),file:n}));
}
export function readAuxiliaries(root=stateRoot){
 if(!fs.existsSync(root))return [];
 return fs.readdirSync(root).filter(n=>/^aux-[a-z0-9-]+\.json$/.test(n)).map(n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8')));
}
export async function reserveAuxiliaries(coordinatorId,count,root=stateRoot){
 must(/^[a-z0-9][a-z0-9-]{0,79}$/.test(coordinatorId??''),'Invalid coordinatorId');
 must(Number.isInteger(count)&&count>=0&&count<=CAP,'Auxiliary count must be 0..20');
 return mutex(root,()=>{
  const others=readAuxiliaries(root).filter(r=>r.coordinatorId!==coordinatorId).reduce((s,r)=>s+r.count,0);
  must(readLeases(root).length+others+count<=CAP,'No capacity to reserve auxiliaries; wait for running agents before starting them');
  const file=path.join(root,`aux-${coordinatorId}.json`);
  if(count===0){if(fs.existsSync(file))fs.unlinkSync(file);return;}
  fs.writeFileSync(file,JSON.stringify({coordinatorId,count,updatedAt:new Date().toISOString(),note:'Explicit release only after the native auxiliary agents stop; survives worker completion and runner exit.'}));
 });
}
export async function acquireLease(task,root=stateRoot){
 return mutex(root,()=>{
  const active=readLeases(root);
  const auxiliaryCount=readAuxiliaries(root).reduce((s,r)=>s+r.count,0);
  if(active.length+auxiliaryCount>=CAP||active.some(a=>conflict(task,a)))return null;
  const slot=Array.from({length:CAP},(_,i)=>i).find(i=>!active.some(a=>a.slot===i));
  const lease={slot,nonce:randomUUID(),ownerPid:process.pid,childPid:null,taskId:task.id,startedAt:new Date().toISOString(),cwd:task.cwd,readPaths:task.readPaths,writePaths:task.writePaths,exclusiveResources:task.exclusiveResources};
  fs.writeFileSync(path.join(root,`slot-${slot}.json`),JSON.stringify(lease));return lease;
 });
}
export async function updateLease(lease,patch,root=stateRoot){
 return mutex(root,()=>{const file=path.join(root,`slot-${lease.slot}.json`);const current=JSON.parse(fs.readFileSync(file,'utf8'));must(current.nonce===lease.nonce,'Lease ownership mismatch');fs.writeFileSync(file,JSON.stringify({...current,...patch}));});
}
export async function releaseLease(lease,root=stateRoot){
 return mutex(root,()=>{const file=path.join(root,`slot-${lease.slot}.json`);const current=JSON.parse(fs.readFileSync(file,'utf8'));must(current.nonce===lease.nonce,'Lease ownership mismatch');fs.unlinkSync(file);});
}

export function discoverPackage(){
 const candidates=[];
 if(process.env.DSH_PACKAGE_ROOT)candidates.push(process.env.DSH_PACKAGE_ROOT);
 else{
  candidates.push(path.join(os.homedir(),'AppData/Roaming/npm/node_modules/@deepseek-ai/dsh'));
  const cache=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData/Local'),'npm-cache/_npx');
  if(fs.existsSync(cache))for(const name of fs.readdirSync(cache))candidates.push(path.join(cache,name,'node_modules/@deepseek-ai/dsh'));
 }
 for(const root of candidates){try{const p=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));if(p.name==='@deepseek-ai/dsh'&&p.version===VERSION&&fs.existsSync(path.join(root,'lib/bin.js')))return root;}catch{}}
 throw Error('Installed @deepseek-ai/dsh '+VERSION+' not found. Set DSH_PACKAGE_ROOT to its package directory; no automatic install/upgrade.');
}
function loadCredential(pkg){
 if(process.env.DEEPSEEK_API_KEY)return process.env.DEEPSEEK_API_KEY;
 const require=createRequire(path.join(pkg,'package.json'));const yaml=require('js-yaml');
 const file=path.join(os.homedir(),'.dsh','.credentials.yaml');
 const key=yaml.load(fs.readFileSync(file,'utf8'))?.refs?.DEEPSEEK_API_KEY;
 must(typeof key==='string'&&key.length>0,'No configured DEEPSEEK_API_KEY');return key;
}
function promptFor(task){
 return `你是代码实施执行者。主代理已经规划；只完成下述任务，不重新设计整个项目。\n工作目录（所有任务路径基于此）：${task.cwd}\nNode 可执行文件：${process.execPath}\n只读范围：${JSON.stringify(task.readPaths)}\n可写范围（其余禁止修改）：${JSON.stringify(task.writePaths)}\n项目上下文与指令：\n${task.projectContext}\n\n实施方案：\n${task.instructions}\n\n验收标准：\n${task.acceptance.map(s=>'- '+s).join('\n')}\n验证命令：\n${task.checks.map(s=>'- '+s).join('\n')}\n\n先读相关实现，保留原有和并发改动，只修改拥有的范围。不读取父目录、凭据或无关文件；不联网、部署、push、创建子代理或再次调用 dsh。仅运行前台命令，禁止启动脱离进程树的进程或遗留后台服务；需要持久服务的验证交给主代理管理。默认不 commit；只有上述任务明确授权本地 commit 时才可按范围提交。不可改测试来掩盖失败。若契约矛盾、缺少关键前提或需要越界，停止写入并返回 needs_decision。运行所列定向检查，失败最多按明确原因修正一次，不无休止增加自测。最后仅用 JSON 对象返回：{"status":"done|needs_decision|failed","summary":"简述","changed_files":[],"checks":[{"command":"实际命令","result":"pass|fail|not_run","detail":"简要证据"}],"blockers":[],"commit":null}。不要声称未执行的检查已通过。`;
}
export function parseFinal(text,reason){
 if(reason!=='completed')return {status:'incomplete',error:'turn/end was '+(reason??'missing')};
 try{const report=JSON.parse(text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));must(['done','needs_decision','failed'].includes(report.status),'Invalid final status');must(Array.isArray(report.changed_files)&&Array.isArray(report.checks)&&Array.isArray(report.blockers),'Invalid final report arrays');return {status:report.status,report};}
 catch(e){return {status:'incomplete',error:'Final JSON invalid: '+e.message,finalText:text};}
}
function waitForExit(child){return new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null)return resolve();child.once('exit',resolve);});}
async function terminateTree(child){
 if(!child.pid)return true;
 if(process.platform==='win32'){
  const code=await new Promise(resolve=>{const killer=spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});killer.once('error',()=>resolve(-1));killer.once('exit',resolve);});
  return code===0;
 }
 try{process.kill(-child.pid,'SIGKILL');return true;}catch(e){return e.code==='ESRCH';}
}
async function runTask(task,lease,outputDir,pkg,key,signal){
 const dir=path.join(outputDir,task.id);fs.mkdirSync(dir,{recursive:true});
 const runtimeHome=path.join(dir,'runtime-home');fs.mkdirSync(runtimeHome);
 const redact=s=>String(s).split(key).join('[REDACTED]');
 const write=(name,value)=>fs.writeFileSync(path.join(dir,name),redact(JSON.stringify(value,null,2)));
 const env={};for(const [k,v] of Object.entries(process.env))if(/^(path|pathext|systemroot|windir|comspec|temp|tmp|userprofile|homedrive|homepath|appdata|localappdata|programfiles|programfiles\(x86\)|programdata|psmodulepath|lang|lc_all)$/i.test(k))env[k]=v;
 Object.assign(env,{DEEPSEEK_API_KEY:key,DSH_HOME:runtimeHome});
 const child=spawn(process.execPath,[path.join(pkg,'lib/bin.js'),'--profile','sdk-minimal'],{cwd:task.cwd,env,stdio:['pipe','pipe','pipe'],windowsHide:true,detached:process.platform!=='win32'});
 delete env.DEEPSEEK_API_KEY;
 const started=Date.now();let nextId=1,buffer='',stderr='',running=false,idle=false,endReason,finalText='',settled=false;
 const usage={inputTokens:0,cacheReadTokens:0,outputTokens:0,reasoningTokens:0,totalTokens:0};let toolCalls=0;
 const pending=new Map();let resolveDone,rejectDone;
 const done=new Promise((resolve,reject)=>{resolveDone=resolve;rejectDone=reject;});done.catch(()=>{});
 const fail=e=>{for(const p of pending.values())p.reject(e);pending.clear();if(!settled){settled=true;rejectDone(e);}};
 const finish=()=>{if(running&&idle&&endReason&&!settled){settled=true;resolveDone();}};
 const request=(method,params)=>new Promise((resolve,reject)=>{
  const id=nextId++;const timer=setTimeout(()=>{pending.delete(id);reject(Error('RPC timeout: '+method));},30000);
  pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n',e=>{if(e){pending.get(id)?.reject(e);pending.delete(id);}});
 });
 child.stdin.on('error',fail);child.stdout.setEncoding('utf8');
 child.stdout.on('data',chunk=>{
  buffer+=chunk;let newline;
  while((newline=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);if(!line.trim())continue;
   let msg;try{msg=JSON.parse(line);}catch{stderr=(stderr+'\nNon-protocol stdout suppressed').slice(-12000);continue;}
   if(msg.id!==undefined&&pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(Error(redact(JSON.stringify(msg.error)))):p.resolve(msg.result);continue;}
   if(msg.method==='session.status'){running ||= msg.params.status==='running';idle=msg.params.status==='idle';finish();}
   const event=msg.method==='session.event'?msg.params.event:null;
   if(event?.type==='assistant/message'){for(const k of Object.keys(usage))usage[k]+=event.data.usage?.[k]??0;const text=event.data.message.content.filter(b=>b.type==='text').map(b=>b.text).join('');if(text)finalText=text;}
   if(event?.type==='tool/call')toolCalls++;
   if(event?.type==='turn/end'){endReason=event.data.reason?.kind;finish();}
  }
 });
 child.stderr.setEncoding('utf8');child.stderr.on('data',chunk=>{stderr=(stderr+redact(chunk)).slice(-12000);});
 child.on('error',fail);child.on('exit',()=>{for(const p of pending.values())p.reject(Error('Runtime exited'));pending.clear();if(!settled)fail(Error('Runtime exited without completed turn'));});
 const timer=setTimeout(()=>fail(Error('Task timeout')),task.timeoutMs);
 const onAbort=()=>fail(Error('Coordinator cancelled'));signal.addEventListener('abort',onAbort,{once:true});if(signal.aborted)onAbort();
 let result,stopped=false;
 try{
  await updateLease(lease,{childPid:child.pid??null});
  if(settled)await done;
  const parameters={cwd:task.cwd,...FIXED};await request('initialize',parameters);
  if(settled)await done;
  const sessionId='execute-'+task.id+'-'+randomUUID();
  await request('session/prompt',{sessionId,contentBlocks:[{type:'text',text:promptFor(task)}]});
  emit({phase:'submitted',task:task.id,slot:lease.slot,pid:child.pid,...FIXED});
  await done;
  result={...parseFinal(finalText,endReason),sessionId};
  await request('shutdown',{});
  stopped=await Promise.race([waitForExit(child).then(()=>true),delay(5000).then(()=>false)]);
  if(!stopped)stopped=await terminateTree(child);
 }catch(e){result={status:'failed',error:redact(e.message)};stopped=await terminateTree(child);}
 finally{
  clearTimeout(timer);signal.removeEventListener('abort',onAbort);
  if(stopped)await releaseLease(lease);else{result={...result,status:'incomplete',error:'Runtime process termination not confirmed; slot retained',retainedSlot:lease.slot};}
  result={...result,task:task.id,cwd:task.cwd,parameters:FIXED,profile:'sdk-minimal',elapsedMs:Date.now()-started,stopReason:endReason??null,toolCalls,usage};
  write('result.json',result);fs.writeFileSync(path.join(dir,'stderr.log'),redact(stderr));
  emit({phase:'finished',task:task.id,status:result.status,elapsedMs:result.elapsedMs,usage});
 }
 return result;
}

export async function runBatch(batch,{pkg=discoverPackage(),key=loadCredential(pkg)}={}){
 if(batch.auxiliaryAgents>0)await reserveAuxiliaries(batch.coordinatorId,batch.auxiliaryAgents);
 fs.mkdirSync(path.dirname(batch.outputDir),{recursive:true});fs.mkdirSync(batch.outputDir); // exclusive: never replay into a prior run
 const abort=new AbortController();let cancelled=false;const cancel=()=>{cancelled=true;abort.abort();};process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 const queue=[...batch.tasks],active=new Map(),results=[];let blockedSince=null,halt=false,peak=0;
 try{
  while(queue.length||active.size){
   if(cancelled)halt=true;
   while(!halt&&queue.length&&active.size<batch.concurrency){
    const task=queue[0];const lease=await acquireLease(task);if(!lease)break;
    queue.shift();const promise=runTask(task,lease,batch.outputDir,pkg,key,abort.signal).catch(e=>({task:task.id,status:'failed',error:String(e.message)})).then(r=>{results.push(r);active.delete(task.id);if(r.status!=='done')halt=true;});active.set(task.id,promise);peak=Math.max(peak,active.size);blockedSince=null;
   }
   if(active.size)await Promise.race([...active.values(),delay(1000)]);
   else if(halt)break;
   else if(queue.length){blockedSince??=Date.now();if(Date.now()-blockedSince>30000){halt=true;break;}await delay(500);}
  }
 }catch(e){cancel();await Promise.allSettled(active.values());throw e;}
 finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
 const summary={status:results.length===batch.tasks.length&&results.every(r=>r.status==='done')?'done':'needs_attention',peakConcurrency:peak,parallelRationale:batch.parallelRationale??null,parameters:FIXED,results,notStarted:queue.map(t=>t.id),retainedAuxiliaryReservation:batch.auxiliaryAgents>0?{coordinatorId:batch.coordinatorId,count:batch.auxiliaryAgents}:null};
 fs.writeFileSync(path.join(batch.outputDir,'summary.json'),JSON.stringify(summary,null,2));return summary;
}
async function main(){
 const [command,file,count]=process.argv.slice(2);
 if(command==='slots'){emit({stateRoot,leases:readLeases(),auxiliaries:readAuxiliaries()});return;}
 if(command==='aux'){await reserveAuxiliaries(file,Number(count));emit({coordinatorId:file,count:Number(count)});return;}
 if(command==='doctor'){emit({packageRoot:discoverPackage(),version:VERSION,node:process.execPath,stateRoot,parameters:FIXED});return;}
 must(['validate','run'].includes(command)&&file,'Usage: node dispatch.mjs doctor|slots|aux <coordinator-id> <count>|validate <batch.json>|run <batch.json>');
 const batch=validateBatch(JSON.parse(fs.readFileSync(path.resolve(file),'utf8')));
 if(command==='validate'){emit({valid:true,tasks:batch.tasks.map(t=>t.id),concurrency:batch.concurrency,parameters:FIXED});return;}
 const result=await runBatch(batch);emit({phase:'batch-finished',status:result.status,peakConcurrency:result.peakConcurrency,notStarted:result.notStarted,summary:path.join(batch.outputDir,'summary.json')});if(result.status!=='done')process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1;});
