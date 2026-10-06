import {NextResponse} from 'next/server'
import {readReviews,updateReviews} from '@/lib/reviews'
export const dynamic='force-dynamic'
function local(request:Request){
  const url=new URL(request.url),host=request.headers.get('host')||url.host,origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site')
  try {const target=new URL(`${url.protocol}//${host}`);return ['localhost','127.0.0.1','[::1]'].includes(target.hostname)&&(!origin||origin===target.origin)&&site!=='cross-site'} catch {return false}
}
export async function GET(request:Request){
  if(!local(request))return NextResponse.json({error:'复盘接口仅供本机同源访问'},{status:403})
  try{const state=await readReviews();if(new URL(request.url).searchParams.get('export')==='1')return new Response(JSON.stringify(state,null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="wanxiang-reviews-backup.json"','Cache-Control':'no-store'}});return NextResponse.json(state,{headers:{'Cache-Control':'no-store'}})}catch(e){return NextResponse.json({error:(e as Error).message},{status:500})}
}
export async function POST(request:Request){
  if(!local(request)||!request.headers.get('content-type')?.includes('application/json'))return NextResponse.json({error:'仅允许本机同源JSON操作'},{status:403})
  try{const raw=await request.text();if(raw.length>100000)return NextResponse.json({error:'内容过长'},{status:413});return NextResponse.json(await updateReviews(JSON.parse(raw)),{headers:{'Cache-Control':'no-store'}})}catch(e){const message=(e as Error).message;return NextResponse.json({error:message==='CONFLICT'?'其他窗口已更新记录，请重新读取后再保存；未覆盖原记录':message},{status:message==='CONFLICT'?409:400})}
}
