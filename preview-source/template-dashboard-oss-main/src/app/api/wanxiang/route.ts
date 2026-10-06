import { readFile } from "node:fs/promises"
import path from "node:path"
import {createHash} from 'node:crypto'
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export async function GET(request: Request) {
  try {
    const directory = process.env.WANXIANG_DATA_DIR || path.resolve(process.cwd(), "../../data")
    const period = new URL(request.url).searchParams.get("period") || "7"
    if (!["7", "30"].includes(period)) return NextResponse.json({ error: "仅支持7天或30天" }, { status: 400 })
    const raw=await readFile(path.join(directory, `dashboard-${period}.json`), "utf8")
    const data = {...JSON.parse(raw),reportKey:createHash('sha256').update(raw).digest('hex')}
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "该周期尚无数据，请点击获取最新数据" }, { status: 503 })
  }
}
