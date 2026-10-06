$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
& (Join-Path $PSScriptRoot '.venv\Scripts\python.exe') (Join-Path $PSScriptRoot 'scripts\browser_session.py') --cdp http://127.0.0.1:9223
