$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
$runtimePath = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
$entryPath = Join-Path $PSScriptRoot 'scripts\browser_session.py'
if (-not (Test-Path -LiteralPath $runtimePath)) {
    throw '请先按 README 安装 Python 环境和依赖。'
}
& $runtimePath $entryPath
if ($LASTEXITCODE -ne 0) {
    throw '采集浏览器运行失败，请检查终端提示。'
}
