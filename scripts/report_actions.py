"""Inspectable UI actions; reloaded in the running browser session."""

async def run(page, command):
    action = command["type"]
    if action == "report_links":
        return await page.locator('a[href*="#!/report/"]').evaluate_all("els => els.map(e => ({text:e.innerText,href:e.getAttribute('href')}))")
    if action == "open_reports":
        await page.goto('https://one.alimama.com/', wait_until='domcontentloaded')
        return {"title": await page.title()}
    if action == "tabs":
        return [{"title": await p.title(), "url": p.url.split('?')[0]} for p in page.context.pages]
    if action == "buttons":
        return await page.locator("button,a,[role=button]").evaluate_all("els => els.filter(e => e.getClientRects().length).map(e => e.innerText.trim()).filter(Boolean)")
    if action == "summary":
        body = await page.locator("body").inner_text()
        lines = body.splitlines()
        terms = ("过去", "今日", "昨天", "下载", "暂无数据", "日期范围", "时间粒度", "累计数据", "生成", "2026-", "确定", "取消")
        return {"title": await page.title(), "lines": [s for s in lines if any(t in s for t in terms)]}
    if action == "press":
        await page.keyboard.press(command["key"])
        return {"status": "done"}
    if action == "frames":
        result = []
        for frame in page.frames:
            result.append({"text": (await frame.locator("body").inner_text())[:2000]})
        return result
    if action == "observe":
        return {"title": await page.title(), "url": page.url.split("?")[0],
                "text": (await page.locator("body").inner_text())[-10000:]}
    if action == "controls":
        scope = page.locator(command["scope"]) if "scope" in command else page
        return await scope.locator("input,button,[role=dialog]").evaluate_all("els => els.filter(e => e.getClientRects().length).map(e => ({tag:e.tagName,role:e.getAttribute('role'),text:e.innerText?.slice(0,300),placeholder:e.getAttribute('placeholder'),value:e.value,html:e.outerHTML.slice(0,800)}))")
    locator = page.get_by_text(command["text"], exact=True).filter(visible=True)
    if "scope" in command:
        locator = page.locator(command["scope"]).get_by_text(command["text"], exact=True).filter(visible=True)
    if "role" in command:
        scope = page.locator(command["scope"]) if "scope" in command else page
        locator = scope.get_by_role(command["role"], name=command["text"], exact=True).filter(visible=True)
    if "row" in command:
        locator = page.locator("tr").filter(has_text=command["row"]).get_by_text(command["text"], exact=True).filter(visible=True)
    if action == "inspect":
        return await locator.evaluate_all("els => els.map(e => ({html:e.outerHTML,parent:e.parentElement.outerHTML.slice(0,3000)}))")
    if "index" in command:
        locator = locator.nth(command["index"])
    if await locator.count() != 1:
        raise ValueError(f"期望一个可见控件，实际 {await locator.count()}")
    if action == "click":
        await locator.click(timeout=10000)
    elif action == "hover":
        await locator.hover(timeout=10000)
    return {"status": "done"}
