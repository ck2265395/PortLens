$ErrorActionPreference = 'Stop'
$serviceMap = @{}
Get-CimInstance Win32_Service | ForEach-Object {
  if ($_.ProcessId -gt 0) {
    if (-not $serviceMap.ContainsKey([int]$_.ProcessId)) { $serviceMap[[int]$_.ProcessId] = @() }
    $serviceMap[[int]$_.ProcessId] += @{ name = $_.Name; displayName = $_.DisplayName; status = $_.State; canStop = [bool]$_.AcceptStop }
  }
}
$processMap = @{}
Get-CimInstance Win32_Process -ErrorAction Stop | ForEach-Object { $processMap[[int]$_.ProcessId] = $_ }
$runtimeMap = @{}
Get-Process -ErrorAction SilentlyContinue | ForEach-Object { $runtimeMap[[int]$_.Id] = $_ }
$processCache = @{}
function Get-ProcessData([int]$pidValue) {
  if ($processCache.ContainsKey($pidValue)) { return $processCache[$pidValue] }
  $cim = if ($processMap.ContainsKey($pidValue)) { $processMap[$pidValue] } else { $null }
  $runtime = if ($runtimeMap.ContainsKey($pidValue)) { $runtimeMap[$pidValue] } else { $null }
  $owner = ''
  if ($cim) { try { $o = Invoke-CimMethod -InputObject $cim -MethodName GetOwner; if ($o.ReturnValue -eq 0) { $owner = if ($o.Domain) { "$($o.Domain)\$($o.User)" } else { $o.User } } } catch {} }
  $started = ''
  if ($runtime) { try { $started = $runtime.StartTime.ToUniversalTime().ToString('o') } catch {} }
  $name = if ($cim) { [string]$cim.Name } elseif ($runtime) { [string]$runtime.Name + '.exe' } else { '' }
  $value = @{ processName = $name; processPath = if ($cim) { [string]$cim.ExecutablePath } else { '' }; commandLine = if ($cim) { [string]$cim.CommandLine } else { '' }; user = $owner; startedAt = $started; services = if ($serviceMap.ContainsKey($pidValue)) { $serviceMap[$pidValue] } else { @() }; isElevated = $false; isCritical = (($pidValue -in @(0,4)) -or ($name -in @('smss.exe','csrss.exe','wininit.exe','winlogon.exe','lsass.exe'))) }
  $processCache[$pidValue] = $value
  return $value
}
$rows = @()
Get-NetTCPConnection -State Listen -ErrorAction Stop | ForEach-Object {
  $p = Get-ProcessData ([int]$_.OwningProcess)
  $rows += @{ protocol='TCP'; localAddress=$_.LocalAddress; localPort=[int]$_.LocalPort; pid=[int]$_.OwningProcess } + $p
}
Get-NetUDPEndpoint -ErrorAction Stop | ForEach-Object {
  $p = Get-ProcessData ([int]$_.OwningProcess)
  $rows += @{ protocol='UDP'; localAddress=$_.LocalAddress; localPort=[int]$_.LocalPort; pid=[int]$_.OwningProcess } + $p
}
@($rows | Sort-Object localPort, protocol, pid) | ConvertTo-Json -Depth 6 -Compress
