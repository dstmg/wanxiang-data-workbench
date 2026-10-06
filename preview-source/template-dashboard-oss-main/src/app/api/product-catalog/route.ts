import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {NextResponse} from 'next/server'
export const dynamic='force-dynamic'
export async function GET(){
  try {const directory=process.env.WANXIANG_DATA_DIR||path.resolve(process.cwd(),'../../data');return NextResponse.json(JSON.parse(await readFile(path.join(directory,'product-catalog.json'),'utf8')),{headers:{'Cache-Control':'no-store'}})}
  catch {return NextResponse.json({error:'尚未导入店铺产品表，请检查本地 product-catalog.json'},{status:404})}
}
