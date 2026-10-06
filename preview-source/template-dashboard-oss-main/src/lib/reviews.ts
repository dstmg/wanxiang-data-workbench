import {randomUUID} from 'node:crypto'
import {mkdir,readFile,writeFile,rename,copyFile} from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

export type Snapshot={view:string;start:string;end:string;reportKey:string;objectId?:string;objectName?:string;scene?:string;metrics:Record<string,number|null>;capturedAt:string}
export type Issue={id:string;problem:string;action:string;status:'pending'|'done'|'verified';executedAt:string;followupDate:string;outcome:string;snapshot:Snapshot|null;createdAt:string;updatedAt:string;archivedAt?:string}
export type Review={id:string;shopId:string;title:string;summary:string;issues:Issue[];createdAt:string;updatedAt:string;archivedAt?:string}
export type ReviewStore={schemaVersion:1;revision:number;shops:{id:string;name:string}[];bindings:Record<string,string>;reviews:Review[]}
export const reviewDirectory=()=>process.env.WANXIANG_REVIEW_DIR||path.join(os.homedir(),'.wanxiang-workbench','reviews')
const empty=():ReviewStore=>({schemaVersion:1,revision:0,shops:[],bindings:{},reviews:[]})
export async function readReviews(directory=reviewDirectory()):Promise<ReviewStore>{
  try{const value=JSON.parse(await readFile(path.join(directory,'reviews.json'),'utf8'));if(value.schemaVersion!==1||!Array.isArray(value.reviews)||!Array.isArray(value.shops)||!Number.isInteger(value.revision)||!value.bindings)throw new Error('不支持的复盘文件格式，请先备份后检查');return value}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return empty();throw e}
}
const str=(value:unknown,max=6000)=>{if(typeof value!=='string'||value.length>max)throw new Error('文字格式错误或超出长度限制');return value}
const id=(value:unknown)=>str(value,100)
function snapshot(value:unknown):Snapshot|null{
  if(value===null||value===undefined)return null
  const v=value as Snapshot,metrics:Record<string,number|null>={}
  if(!v.metrics||typeof v.metrics!=='object'||Object.keys(v.metrics).length>30)throw new Error('指标快照无效')
  for(const [k,n] of Object.entries(v.metrics)){if(!/^[a-zA-Z]{1,40}$/.test(k)||!(n===null||typeof n==='number'&&Number.isFinite(n)))throw new Error('指标快照无效');metrics[k]=n}
  return {view:str(v.view,60),start:str(v.start,10),end:str(v.end,10),reportKey:str(v.reportKey,64),objectId:v.objectId===undefined?undefined:str(v.objectId,100),objectName:v.objectName===undefined?undefined:str(v.objectName,500),scene:v.scene===undefined?undefined:str(v.scene,100),metrics,capturedAt:new Date().toISOString()}
}
export function applyReviewCommand(current:ReviewStore,body:Record<string,unknown>):ReviewStore{
  if(body.revision!==current.revision)throw new Error('CONFLICT')
  const next:ReviewStore=JSON.parse(JSON.stringify(current)),now=new Date().toISOString()
  const shop=()=>{const found=next.shops.find(s=>s.id===id(body.shopId));if(!found)throw new Error('店铺不存在');return found}
  const review=()=>{const s=shop(),r=next.reviews.find(r=>r.id===id(body.reviewId)&&r.shopId===s.id);if(!r)throw new Error('该店铺没有这次复盘');r.updatedAt=now;return r}
  switch(body.op){
    case 'createShop':{const name=str(body.name,80).trim();if(!name)throw new Error('请输入店铺名称');if(next.shops.some(s=>s.name===name))throw new Error('店铺名称已存在');next.shops.push({id:randomUUID(),name});break}
    case 'bindReport':{const s=shop(),key=str(body.reportKey,64);if(!/^[a-f0-9]{64}$/.test(key))throw new Error('报表标识无效');if(next.bindings[key]&&next.bindings[key]!==s.id)throw new Error('此报表已绑定其他店铺，不能改绑；请读取对应店铺的报表');next.bindings[key]=s.id;break}
    case 'createReview':{const s=shop();next.reviews.unshift({id:randomUUID(),shopId:s.id,title:str(body.title,160).trim()||'未命名复盘',summary:'',issues:[],createdAt:now,updatedAt:now});break}
    case 'updateReview':{const r=review();r.title=str(body.title,160).trim()||'未命名复盘';r.summary=str(body.summary,12000);break}
    case 'archiveReview':{const r=review();if(typeof body.archived!=='boolean')throw new Error('归档参数无效');r.archivedAt=body.archived?now:undefined;break}
    case 'archiveIssue':{const r=review(),i=r.issues.find(i=>i.id===id(body.issueId));if(!i)throw new Error('问题不存在');if(typeof body.archived!=='boolean')throw new Error('归档参数无效');i.archivedAt=body.archived?now:undefined;i.updatedAt=now;break}
    case 'addIssue':{const r=review(),snap=snapshot(body.snapshot);if(snap&&next.bindings[snap.reportKey]!==r.shopId)throw new Error('当前报表未绑定此店铺，不能带入指标；可先手动记录');r.issues.push({id:randomUUID(),problem:'',action:'',status:'pending',executedAt:'',followupDate:'',outcome:'',snapshot:snap,createdAt:now,updatedAt:now});break}
    case 'updateIssue':{const r=review(),issue=r.issues.find(i=>i.id===id(body.issueId));if(!issue)throw new Error('问题不存在');if(!['pending','done','verified'].includes(String(body.status)))throw new Error('状态无效');issue.problem=str(body.problem);issue.action=str(body.action);issue.outcome=str(body.outcome);issue.executedAt=str(body.executedAt,10);issue.followupDate=str(body.followupDate,10);for(const d of [issue.executedAt,issue.followupDate])if(d&&!/^\d{4}-\d{2}-\d{2}$/.test(d))throw new Error('日期格式无效');issue.status=body.status as Issue['status'];issue.updatedAt=now;break}
    default:throw new Error('不支持的操作')
  }
  next.revision++;return next
}
let queue:Promise<unknown>=Promise.resolve()
export function updateReviews(body:Record<string,unknown>,directory=reviewDirectory()){
  const run=queue.then(async()=>{const current=await readReviews(directory),next=applyReviewCommand(current,body);await mkdir(directory,{recursive:true});const file=path.join(directory,'reviews.json'),temporary=path.join(directory,`reviews-${randomUUID()}.tmp`);await writeFile(temporary,JSON.stringify(next,null,2),'utf8');try{await copyFile(file,path.join(directory,'reviews.previous.json'))}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e}await rename(temporary,file);return next})
  queue=run.catch(()=>{});return run
}
