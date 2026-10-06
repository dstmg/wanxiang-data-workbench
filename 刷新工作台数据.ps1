$ErrorActionPreference = 'Stop'
& "$PSScriptRoot\.venv\Scripts\python.exe" "$PSScriptRoot\scripts\import_dashboard.py"
if ($LASTEXITCODE -ne 0) { throw '导入未通过检查，保留上次工作台数据。' }
Write-Host '导入完成。请在工作台点击刷新数据。'
