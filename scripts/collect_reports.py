"""Official UI export worker. Stops on login/ambiguous UI; never changes ad plans."""
import argparse
import asyncio
import json
import subprocess
import time
import zipfile
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright
from playwright.async_api import expect
from import_dashboard import ROOT, build
from collection_state import Journal, valid_zip
import re

REPORTS = ['营销场景报表', '计划报表', '人群报表', '商品报表', '关键词报表', '内容报表', '创意报表', '地域报表', '单元报表', '权益报表']
ROUTES = dict(zip(REPORTS, ['account', 'campaign', 'crowd', 'item_promotion', 'bidword', 'other_promotion', 'creative', 'area', 'adgroup', 'coupon']))

def status(state, message, completed=0, **extra):
    value = dict(state=state, message=message, completed=completed, total=len(REPORTS), updated=time.time(), **extra)
    target = ROOT / 'data/collection-status.json'
    target.parent.mkdir(exist_ok=True)
    temp = target.with_suffix('.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False), encoding='utf-8')
    temp.replace(target)
    print(message, flush=True)

async def text(page, label):
    return page.get_by_text(label, exact=True).filter(visible=True)

async def run(period):
    journal = Journal(period, REPORTS)
    directory = journal.directory
    def progress(message, state='running'):
        status(state, message, journal.completed, period=period,
               reports=[{'report': i['report'], 'state': i['state']} for i in journal.value['items']])
    progress('恢复未完成批次，连接专用 Chrome…' if journal.resumed else '连接专用 Chrome…')
    async with async_playwright() as p:
        try:
            browser = await p.chromium.connect_over_cdp('http://127.0.0.1:9223')
        except Exception:
            launched = subprocess.run(['powershell', '-NoProfile', '-File', str(ROOT / '先打开谷歌浏览器.ps1')], capture_output=True, timeout=30)
            if launched.returncode:
                # Preserve diagnostics locally; do not expose raw subprocess commands in UI.
                (ROOT / 'data/browser-launch-error.log').write_bytes(launched.stderr + b'\n' + launched.stdout)
                raise RuntimeError('采集浏览器启动失败，诊断已保存到 data/browser-launch-error.log；请检查 Chrome 安装和脚本运行权限。')
            for _ in range(10):
                await asyncio.sleep(1)
                try:
                    browser = await p.chromium.connect_over_cdp('http://127.0.0.1:9223')
                    break
                except Exception:
                    pass
            else:
                raise RuntimeError('Chrome连接失败，请先打开采集浏览器')
        context = browser.contexts[0]
        pages = [x for x in context.pages if 'one.alimama.com' in x.url]
        page = pages[0] if pages else await context.new_page()
        if not pages:
            await page.goto('https://one.alimama.com/', wait_until='domcontentloaded')
        await page.bring_to_front()
        if 'login' in page.url or await (await text(page, '立即登录')).count():
            progress('请在专用 Chrome 手动登录，完成后重新点击获取数据，将继续原批次。', 'needs_login')
            return
        # Reconcile interrupted submissions before ever creating another task.
        uncertain = [i for i in journal.value['items'] if i['state'] == 'submitting']
        if uncertain:
            await page.goto('https://one.alimama.com/index.html#!/report/download-list', wait_until='domcontentloaded')
            await page.get_by_role('button', name='刷新表格', exact=True).wait_for(timeout=20000)
            for item in uncertain:
                matches = await task_row(page, item['name'])
                if matches is None:
                    raise RuntimeError(f"{item['report']}提交结果不确定，未重复提交；请核对下载管理")
                journal.update(item, 'submitted')
        for item in journal.value['items']:
            if item['state'] != 'pending':
                continue
            report = item['report']
            progress(f'提交{period}天：{report}')
            # A rejected export can leave its dialog open across hash navigation.
            stale = page.locator('[id^="cnt_dlg_"]').filter(visible=True).filter(has=page.get_by_text('文件名称', exact=True))
            if await stale.count() == 1:
                await stale.get_by_text('取消', exact=True).click()
                await expect(stale).to_have_count(0)
            route = ROUTES[report]
            await page.goto(f'https://one.alimama.com/index.html#!/report/{route}?rptType={route}', wait_until='domcontentloaded')
            await page.get_by_role('button', name='下载报表', exact=True).wait_for(timeout=20000)
            await page.get_by_role('button', name='下载报表', exact=True).click()
            # Date control inside export dialog must be verified before submission.
            dialog = page.locator('[id^="cnt_dlg_"]').filter(visible=True).filter(has=page.locator('input[type="text"]').filter(visible=True))
            await expect(dialog).to_have_count(1, timeout=10000)
            date = dialog.get_by_text(f'过去 {period} 天', exact=True).filter(visible=True)
            if not await date.count():
                previous = dialog.get_by_text(f'过去 {30 if period == 7 else 7} 天', exact=True).filter(visible=True)
                await previous.last.click()
                choice = page.get_by_text(f'过去 {period} 天', exact=True).filter(visible=True)
                await choice.last.click()
            await expect(date).to_have_count(1, timeout=10000)
            inputs = dialog.locator('input[type="text"]').filter(visible=True)
            name = item['name']
            if len(name) > 32:
                raise RuntimeError(f'{report}导出名称超过后台32字限制，请核对批次命名')
            await inputs.last.fill(name)
            # The site's custom inputs bind on keyup/change, not only the input event.
            await inputs.last.press('ArrowRight')
            await inputs.last.press('Tab')
            await expect(inputs.last).to_have_value(name)
            confirm = dialog.get_by_role('button', name='确定', exact=True).filter(visible=True)
            await expect(confirm).to_have_count(1, timeout=10000)
            journal.update(item, 'submitting')
            await confirm.click()
            # A click is not evidence of a server-created task. Wait for the
            # export dialog to close before navigation, then verify the task.
            await expect(dialog).to_have_count(0, timeout=20000)
            await page.goto('https://one.alimama.com/index.html#!/report/download-list', wait_until='domcontentloaded')
            await page.get_by_role('button', name='刷新表格', exact=True).wait_for(timeout=20000)
            found = None
            for attempt in range(3):
                found = await task_row(page, name)
                if found is not None:
                    break
                if attempt < 2:
                    await asyncio.sleep(3)
                    await page.get_by_role('button', name='刷新表格', exact=True).click()
            if found is None:
                raise RuntimeError(f'{report}提交未确认：下载管理没有对应任务，未自动重试')
            expected = f"{journal.value['start']}至{journal.value['end']}"
            task_text = re.sub(r'\s+', '', await found.inner_text())
            if expected not in task_text or '15天累计数据' not in task_text:
                raise RuntimeError(f'{report}提交任务日期或归因周期不符')
            journal.update(item, 'submitted', detail='下载管理已确认任务')
        await page.goto('https://one.alimama.com/index.html#!/report/download-list', wait_until='domcontentloaded')
        deadline = time.monotonic() + 660
        missing_attempts = {}
        while journal.completed < len(REPORTS):
            if time.monotonic() > deadline:
                raise RuntimeError('报表生成超过11分钟，停止等待；已提交任务仍可在官方后台下载')
            if 'login' in page.url:
                progress('登录已失效，请登录后重新操作；将继续未完成报表。', 'needs_login')
                return
            for item in journal.value['items']:
                if item['state'] == 'downloaded':
                    continue
                name = item['name']
                row = await task_row(page, name)
                if row is None:
                    missing_attempts[name] = missing_attempts.get(name, 0) + 1
                    journal.update(item, item['state'], detail='下载管理中未匹配到任务，未重复提交')
                    if missing_attempts[name] >= 3:
                        raise RuntimeError(f'{item["report"]}连续三次未匹配到后台任务；已保留其他文件，请核对下载管理中的任务名称。未重复提交。')
                    continue
                missing_attempts.pop(name, None)
                row_text = await row.inner_text()
                if '生成失败' in row_text:
                    raise RuntimeError(f'{item["report"]}后台生成失败；保留其他报表，不重建任务')
                if '生成成功' not in row_text:
                    journal.update(item, 'submitted', detail='后台生成中')
                    continue
                expected = f"{journal.value['start']}至{journal.value['end']}"
                if expected not in re.sub(r'\s+', '', row_text) or '15天累计数据' not in re.sub(r'\s+', '', row_text):
                    raise RuntimeError(f'{item["report"]}日期或归因周期与目标不一致')
                journal.update(item, 'submitted', detail='准备下载')
                await row.scroll_into_view_if_needed()
                await row.hover()
                button = page.get_by_role('button', name='下载', exact=True).filter(visible=True)
                if await button.count() != 1:
                    raise RuntimeError('下载按钮不唯一，停止以免下载错误文件')
                async with page.expect_download(timeout=60000) as info:
                    await button.click()
                download = await info.value
                filename = Path(download.suggested_filename).name
                if name not in filename:
                    raise RuntimeError('下载文件名称与任务不一致')
                target = directory / filename
                await download.save_as(target)
                if not valid_zip(target):
                    raise RuntimeError('下载文件校验失败')
                journal.update(item, 'downloaded', file=filename, detail='ZIP校验通过')
                progress(f'已下载 {journal.completed}/{len(REPORTS)}')
            if journal.completed < len(REPORTS):
                progress('等待未完成报表；已下载项不会重复处理…')
                await asyncio.sleep(8)
                await page.get_by_role('button', name='刷新表格', exact=True).click()
        build(period, directory)
        journal.value['state'] = 'complete'
        journal.save()
        progress(f'{period}天报表下载并导入完成', 'complete')

async def task_row(page, name):
    # Match normalized table cells, not global text or substring-containing rows.
    for page_number in range(1, 6):
        jump = page.get_by_role('button', name='跳转', exact=True).filter(visible=True)
        field = page.locator('input[type="text"]').filter(visible=True)
        if await jump.count() == 1 and await field.count() == 1:
            await field.fill(str(page_number))
            await field.press('ArrowRight')
            await field.press('Tab')
            await jump.click()
        elif page_number > 1:
            break
        # The SPA updates asynchronously after refresh/jump. Do not inspect an empty render.
        await page.locator('tr td').first.wait_for(timeout=15000)
        await page.wait_for_timeout(800)
        rows = page.locator('tr').filter(has=page.get_by_text(name, exact=True))
        if await rows.count() == 1:
            return rows
        if await rows.count() > 1:
            raise RuntimeError('任务名重复，停止下载以免选错文件')
    return None

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--period', type=int, choices=[7, 30], required=True)
    args = parser.parse_args()
    try:
        asyncio.run(run(args.period))
    except Exception as exc:
        try:
            previous = json.loads((ROOT / 'data/collection-status.json').read_text(encoding='utf-8'))
        except (OSError, ValueError):
            previous = {}
        status('error', '采集停止：' + str(exc)[:350], previous.get('completed', 0), period=args.period, reports=previous.get('reports', []))
