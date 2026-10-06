import { spawn } from "node:child_process"
import { readFile, mkdir, open, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import {demoMode} from '@/lib/demo-data'
export const dynamic = "force-dynamic"
export const runtime = "nodejs"
const root = () => path.resolve(process.cwd(), "../..")
export async function GET() {
  if(demoMode())return NextResponse.json({state:'idle',message:'演示模式不采集真实报表'})
  try { return NextResponse.json(JSON.parse(await readFile(path.join(root(), "data/collection-status.json"), "utf8"))) }
  catch { return NextResponse.json({ state: "idle", message: "尚未开始采集" }) }
}
export async function POST(request: Request) {
  if(demoMode())return NextResponse.json({error:'演示模式禁止采集真实报表'},{status:403})
  const url = new URL(request.url)
  const origin = request.headers.get("origin")
  const expectedOrigin = `${url.protocol}//${request.headers.get("host")}`
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || origin !== expectedOrigin) return NextResponse.json({ error: "只允许本机工作台发起采集" }, { status: 403 })
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: "请求格式错误" }, { status: 400 }) }
  if (![7, 30].includes(body.period)) return NextResponse.json({ error: "仅支持7或30天" }, { status: 400 })
  const directory = path.join(root(), "data")
  await mkdir(directory, { recursive: true })
  const lock = path.join(directory, "collection.lock")
  let handle
  try { handle = await open(lock, "wx") } catch {
    // Only recover a recorded lock whose process is definitely gone.
    try {
      const saved = JSON.parse(await readFile(lock, "utf8"))
      if (!Number.isInteger(saved.pid)) throw new Error("Unknown owner")
      try { process.kill(saved.pid, 0); return NextResponse.json({ error: "已有采集任务正在运行" }, { status: 409 }) }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== "ESRCH") throw e }
      await unlink(lock)
      handle = await open(lock, "wx")
    } catch { return NextResponse.json({ error: "已有采集任务或无法确认归属的锁，请检查后再试" }, { status: 409 }) }
  }
  await handle.close()
  await writeFile(path.join(directory, "collection-status.json"), JSON.stringify({ state: "running", message: "正在启动采集…", period: body.period, completed: 0, total: 10 }))
  const child = spawn(path.join(root(), ".venv/Scripts/python.exe"), [path.join(root(), "scripts/collect_reports.py"), "--period", String(body.period)], { cwd: root(), windowsHide: true, stdio: "ignore" })
  if (child.pid) await writeFile(lock, JSON.stringify({ pid: child.pid, created: Date.now() }))
  const timer = setTimeout(() => child.kill(), 15 * 60 * 1000)
  const cleanup = async () => { clearTimeout(timer); await unlink(lock).catch(() => {}) }
  child.on("error", async () => { await writeFile(path.join(directory, "collection-status.json"), JSON.stringify({ state: "error", message: "采集进程无法启动，请检查Python环境" })); await cleanup() })
  child.on("exit", async () => {
    try { const file = path.join(directory, "collection-status.json"); const state = JSON.parse(await readFile(file, "utf8")); if (state.state === "running") await writeFile(file, JSON.stringify({ ...state, state: "error", message: "采集进程已结束或超时，请重试" })) } finally { await cleanup() }
  })
  return NextResponse.json({ state: "running" }, { status: 202 })
}
