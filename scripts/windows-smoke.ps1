param([switch]$LaunchApp)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$snapshotScript = Join-Path $root 'src\main\system\scripts\get-port-snapshot.ps1'
$appPath = Join-Path $root 'release\win-unpacked\PortLens.exe'
$installerPath = Join-Path $root 'release\PortLens-0.1.0-Setup-x64.exe'

if (-not [Environment]::Is64BitOperatingSystem) { throw 'PortLens requires 64-bit Windows.' }
if (-not (Test-Path -LiteralPath $snapshotScript)) { throw 'Port snapshot script is missing.' }
if (-not (Test-Path -LiteralPath $appPath)) { throw 'Packaged PortLens.exe is missing.' }
if (-not (Test-Path -LiteralPath $installerPath)) { throw 'NSIS installer is missing.' }

$raw = & powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $snapshotScript
$parsed = $raw | ConvertFrom-Json
$records = @($parsed | ForEach-Object { $_ })
$tcp = @($records | Where-Object { $_.protocol -eq 'TCP' })
$udp = @($records | Where-Object { $_.protocol -eq 'UDP' })
if ($records.Count -eq 0) { throw 'No local listening or bound ports were discovered.' }
if ($tcp.Count -eq 0) { throw 'No TCP listeners were discovered.' }
if ($udp.Count -eq 0) { throw 'No UDP bindings were discovered.' }
if ($records | Where-Object { -not $_.pid -or -not $_.localPort -or -not $_.processName }) { throw 'One or more records is missing PID, port, or process identity.' }

if ($LaunchApp) {
  $process = Start-Process -FilePath $appPath -PassThru
  $deadline = [DateTime]::UtcNow.AddSeconds(15)
  do { Start-Sleep -Milliseconds 250; $process.Refresh() } while ($process.MainWindowHandle -eq 0 -and -not $process.HasExited -and [DateTime]::UtcNow -lt $deadline)
  if ($process.HasExited -or $process.MainWindowHandle -eq 0) { throw 'Packaged app did not create its main window.' }
  if (-not $process.CloseMainWindow()) { throw 'Packaged app did not accept a normal window close request.' }
  if (-not $process.WaitForExit(10000)) { throw 'Packaged app did not exit after its window closed.' }
}

[pscustomobject]@{
  Passed = $true
  Records = $records.Count
  Tcp = $tcp.Count
  Udp = $udp.Count
  InstallerBytes = (Get-Item -LiteralPath $installerPath).Length
  AppLaunched = [bool]$LaunchApp
}
