# 万相台推广工作台

把官方推广报表接成“查看变化 → 找待核查对象 → 记录修改 → 复查结果”的本地工作流。

这是本地单人参考项目，不是阿里巴巴官方产品，不是自动投放系统，也不是生意参谋工作台。仓库不含真实经营数据、商品清单、截图、复盘或登录信息。

## 下载

打开 https://github.com/dstmg/wanxiang-data-workbench → Code → Download ZIP → 解压到独立目录。在 WorkBuddy 打开项目根目录，使用 [WORKBUDDY.md](WORKBUDDY.md) 的提示词。熟悉 Git 也可 `git clone https://github.com/dstmg/wanxiang-data-workbench.git`。

## 已有功能

- 整体、计划、推广商品、地域、关键词、人群、单元、创意视图；搜索、排序、筛选和悬浮全屏详情。
- 大号汇总、自定义指标、等长前周期对比；缺日期或超范围不制造有效涨幅。
- 店透视同店产品表按链接里的商品ID精确关联，区分本周期有花费、零花费记录、无记录和未收录。
- 同场景加权ROI内部核查清单；商品→计划、计划→商品关系视图。
- 跨数据页复盘面板、逐条问题/执行/复查、证据快照、多店铺复盘隔离与JSON备份。
- 官方页面导出与断点恢复脚本；登录、验证码由本人处理，后台变化可能需要适配。

## 环境与首次启动

主要支持 Windows，Node.js 20+、Python 3.10+、Google Chrome。先启动空工作台，不必登录平台。前端依赖以锁文件为准。

```powershell
cd preview-source/template-dashboard-oss-main
npm ci
npm test
npm run test:empty
npm run dev -- --port 5190
```

打开 http://127.0.0.1:5190/wanxiang 。没有报表时明确显示缺数据，不预置虚构业绩。终端关闭后服务停止；端口占用换成5192等，不结束未知进程。仅监听本机，勿部署公网或开放局域网。

`test:empty` 会在独立临时数据与复盘目录启动测试服务，不读取正式店铺记录，不登录、不采集。它只验证空数据与接口边界，不证明新电脑采集和真实报表适配成功。

## Python与报表

在仓库根目录运行，需已有 Python：

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
.venv/Scripts/python.exe scripts/browser_session.py --check
```

已有官方导出ZIP时可先离线导入；不要修改原始文件。每类ZIP必须含一个CSV，当前适配营销场景、计划、商品、地域、关键词、人群、单元、创意共八类官方字段。要求周期和粒度一致，基础指标对账通过；不是任意Excel都能分析。

```powershell
.venv/Scripts/python.exe scripts/import_dashboard.py --period 7 --report-dir "你的7天批次目录"
.venv/Scripts/python.exe scripts/import_dashboard.py --period 30 --report-dir "你的30天批次目录"
```

结果在 `data/dashboard-7.json` 和 `data/dashboard-30.json`，前端点“重新读取本地数据”。切日期只读取已下载数据，15/30天需要本地30天数据，不能凭空产生历史。

使用采集前请阅读 [USAGE.md](USAGE.md)。只在自己有权使用的店铺操作，遵守平台规则。专用Chrome登录目录在用户本地应用数据下 `WanxiangWorkbench`，不会随仓库发布。采集会向平台提交报表导出任务，但不改计划、出价或预算；失败/不确定时保留诊断，不反复提交。

产品表同店确认后先只读检查：

```powershell
.venv/Scripts/python.exe scripts/import-product-catalog.py "你的店透视产品表.xlsx" --same-shop-confirmed --check
.venv/Scripts/python.exe scripts/import-product-catalog.py "你的店透视产品表.xlsx" --same-shop-confirmed
```

`--same-shop-confirmed` 表示操作者实际核对，不是跳过核验。更新报表后可能需重新确认并导入产品表。

## 分析边界

- ROI=归因成交合计÷花费合计，不是利润率；缺成本、退款等口径不能判盈亏，低于同场景基准只表示待核查。
- 不平均行ROI，不跨维度相加；收藏加购不是去重人数。缺失不补零，颜色不表示好坏。
- 商品↔计划基于单元主体ID×计划ID×场景，当前仅已有关键词推广单元覆盖，不代表全量或因果。
- 地域只有省级且无计划ID；关键词缺计划ID和商品ID，无法做计划×地域或关键词→产品的精确结论。没有中国地图。
- 无记录不表示从未推广/暂停；价格销量是产品快照，非实时，SKU字段不支持SKU级效果。
- 多店铺支持在复盘层；不会自动切换推广报表。不同店铺建议独立副本、端口和专用浏览器身份，先核对来源。
- 复盘是记录，不自动执行修改、推送提醒或推断改善原因；备份恢复目前为维护者手动流程。

## 隐私与许可

真实文件在 `data/`；正式复盘默认在用户目录 `.wanxiang-workbench/reviews`，可通过 `WANXIANG_REVIEW_DIR` 指定绝对目录。浏览器草稿不是正式保存，换电脑前备份。不要多个服务共用一个复盘目录。

不要提交原始报表、图片、复盘、登录目录、Cookie、密钥或本地配置到GitHub。WorkBuddy等云端AI读取文件不代表完全离线，发送真实文件前先确认范围与脱敏。

自有代码采用 [MIT](LICENSE)。前端基于 Tremor Dashboard Template，原有部分保留 Apache-2.0；详见 [第三方说明](THIRD_PARTY_NOTICES.md) 和前端目录 LICENSE.md。这不是把第三方代码改为MIT。模板演示页中的数据为上游示例，不能视为你的报表；入口默认进入万相台。
