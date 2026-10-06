import {spawn} from 'node:child_process'
import {stat} from 'node:fs/promises'
import path from 'node:path'
import {NextResponse} from 'next/server'
import {demoMode} from '@/lib/demo-data'
export const runtime='nodejs'
export async function POST(request:Request) {
  if(demoMode())return NextResponse.json({error:'演示模式不打开真实报表目录'},{status:403})
  const url=new URL(request.url)
  if(!['127.0.0.1','localhost'].includes(url.hostname)||request.headers.get('origin')!==`${url.protocol}//${request.headers.get('host')}`)return NextResponse.json({error:'只允许本机工作台打开文件夹'},{status:403})
  // Fixed target: never accept arbitrary paths or shell commands.
  const folder=path.join(process.env.WANXIANG_DATA_DIR||path.resolve(process.cwd(),'../../data'),'reports')
  try {
    if(!(await stat(folder)).isDirectory())throw new Error('not a directory')
    if(process.platform!=='win32')return NextResponse.json({error:'自动打开暂仅支持Windows',path:folder},{status:501})
    await new Promise<void>((resolve,reject)=>{
      const child=spawn('explorer.exe',[folder],{shell:false,stdio:'ignore',detached:true})
      child.once('error',reject);child.once('spawn',()=>{child.unref();resolve()})
    })
    return NextResponse.json({path:folder,message:'已请求打开本地报表文件夹'})
  }catch{return NextResponse.json({error:'文件夹不存在或无法打开',path:folder},{status:500})}
}
