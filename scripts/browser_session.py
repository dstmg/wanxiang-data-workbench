"""Persistent visible browser and official-export download foundation."""
import argparse
import asyncio
import json
import os
import importlib
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def settings(config_path=None):
    path = Path(config_path) if config_path else ROOT / "config.local.json"
    if not path.exists():
        path = ROOT / "config.example.json"
    config = json.loads(path.read_text(encoding="utf-8-sig"))
    profile = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "WanxiangWorkbench" / ("browser-profile-" + config.get("browser_channel", "chrome"))
    downloads = Path(config.get("download_dir", "data/reports"))
    if not downloads.is_absolute():
        downloads = ROOT / downloads
    return config, profile, downloads.resolve()


async def save_download(download, directory):
    directory.mkdir(parents=True, exist_ok=True)
    name = Path(download.suggested_filename).name
    target = directory / (datetime.now().strftime("%Y%m%d_%H%M%S_%f_") + name)
    await download.save_as(target)
    if not target.exists() or target.stat().st_size == 0:
        raise RuntimeError("下载文件为空或未保存")
    print(f"下载完成：{target}", flush=True)
    return target


async def run(args):
    from playwright.async_api import async_playwright
    config, profile, downloads = settings(args.config)
    if args.check:
        print(json.dumps({"status": "ready", "browser": config.get("browser_channel", "msedge"),
                          "download_dir": str(downloads)}, ensure_ascii=False))
        return
    pending = set()
    failures = []

    def capture(download):
        task = asyncio.create_task(save_download(download, downloads))
        pending.add(task)
        def done(result):
            pending.discard(result)
            if not result.cancelled() and result.exception():
                failures.append(str(result.exception()))
                print(f"下载失败：{result.exception()}", flush=True)
        task.add_done_callback(done)

    async with async_playwright() as playwright:
        options = dict(user_data_dir=str(profile), headless=False, accept_downloads=True,
                       viewport={"width": 1440, "height": 1000})
        channel = config.get("browser_channel", "chrome")
        if channel != "chromium":
            options["channel"] = channel
        attached = bool(args.cdp)
        if attached:
            browser = await playwright.chromium.connect_over_cdp(args.cdp)
            context = browser.contexts[0]
        else:
            context = await playwright.chromium.launch_persistent_context(**options)
        for page in context.pages:
            page.on("download", capture)
        context.on("page", lambda page: page.on("download", capture))
        page = context.pages[0] if context.pages else await context.new_page()
        try:
            if not attached and not any("one.alimama.com" in item.url and "#!" in item.url for item in context.pages):
                await page.goto(config["start_url"], wait_until="domcontentloaded", timeout=60000)
            print("浏览器已打开，请在窗口中完成登录。当前版本会保存手动点击导出的文件。", flush=True)
            while True:
                command = await asyncio.to_thread(input, "命令 observe / click 按钮文字 / quit：")
                if command.strip() in ("", "quit"):
                    break
                pages = [item for item in context.pages if not item.is_closed()]
                page = pages[-1]
                if command.startswith("action "):
                    try:
                        import report_actions
                        importlib.reload(report_actions)
                        result = await report_actions.run(page, json.loads(command[7:]))
                        print(json.dumps(result, ensure_ascii=False), flush=True)
                    except Exception as exc:
                        print(f"操作未完成：{type(exc).__name__}: {str(exc)[:1000]}", flush=True)
                elif command.strip() == "observe":
                    print(json.dumps({"title": await page.title(), "text": (await page.locator("body").inner_text())[:5500]}, ensure_ascii=False), flush=True)
                elif command.startswith("inspect "):
                    label = command[8:].strip()
                    print(await page.get_by_text(label, exact=True).evaluate_all("els => els.map(e => ({tag:e.tagName,html:e.outerHTML.slice(0,1600)}))"), flush=True)
                elif command.startswith("hover "):
                    label = command[6:].strip()
                    try:
                        await page.get_by_text(label, exact=True).filter(visible=True).first.hover(timeout=5000)
                        print("悬停完成", flush=True)
                    except Exception as exc:
                        print(f"悬停未完成：{type(exc).__name__}", flush=True)
                elif command.startswith("click "):
                    label = command[6:].strip()
                    try:
                        await page.get_by_text(label, exact=True).filter(visible=True).first.click(timeout=10000)
                        print("点击完成", flush=True)
                    except Exception as exc:
                        print(f"点击未完成：{type(exc).__name__}", flush=True)
            if pending:
                await asyncio.gather(*list(pending), return_exceptions=True)
            if failures:
                raise RuntimeError(f"有 {len(failures)} 个下载失败")
        finally:
            if not attached:
                await context.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--cdp", help="Attach to an independently running Chrome; leave it open on exit")
    asyncio.run(run(parser.parse_args()))
