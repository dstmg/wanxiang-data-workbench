$ErrorActionPreference = 'Stop'
$chromePath = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path -LiteralPath $chromePath)) {
    throw 'Google Chrome was not found. Configure the installed executable path.'
}
$profilePath = Join-Path $env:LOCALAPPDATA 'WanxiangWorkbench\browser-profile-chrome'
$launchArgs = @('--remote-debugging-address=127.0.0.1', '--remote-debugging-port=9223', ('--user-data-dir="' + $profilePath + '"'), 'https://one.alimama.com/')
Start-Process -FilePath $chromePath -ArgumentList $launchArgs -WindowStyle Normal
Write-Host 'Dedicated Chrome launch requested. Please sign in and keep this window open.'
