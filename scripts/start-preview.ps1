$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$previewDirectory = Join-Path $projectDirectory '.preview'
$viteEntry = Join-Path $projectDirectory 'node_modules\vite\bin\vite.js'
if (-not (Test-Path -LiteralPath (Join-Path $projectDirectory 'dist\index.html'))) {
    throw 'Build the website first with npm run build.'
}
$listener = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    Write-Output 'A server is already listening at http://127.0.0.1:5173/. No second server started.'
    exit 0
}
New-Item -ItemType Directory -Force -Path $previewDirectory | Out-Null
$nodeExecutable = (Get-Command node.exe).Source
$process = Start-Process -FilePath $nodeExecutable -ArgumentList @('"' + $viteEntry + '"', 'preview', '--host', '127.0.0.1', '--port', '5173', '--strictPort') -WorkingDirectory $projectDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $previewDirectory 'server.log') -RedirectStandardError (Join-Path $previewDirectory 'server-error.log') -PassThru
$process.Id | Set-Content -LiteralPath (Join-Path $previewDirectory 'server.pid')
Write-Output "Independent preview started: http://127.0.0.1:5173/ (process $($process.Id))."
