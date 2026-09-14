# Installs MINO as a Windows app:
#   - Start Menu shortcut ("MINO") under this user's programs
#   - Optional startup entry so MINO launches when you log in
# Run once:  powershell -ExecutionPolicy Bypass -File scripts\install_mino.ps1
# Startup only: powershell -ExecutionPolicy Bypass -File scripts\install_mino.ps1 -Startup

param([switch]$Startup)

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$launcher = Join-Path $root 'start_mino.bat'
if (-not (Test-Path $launcher)) { Write-Error "start_mino.bat not found next to this script's repo root: $launcher"; exit 1 }

$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\MINO.lnk")
$lnk.TargetPath = $launcher
$lnk.WorkingDirectory = $root
$lnk.Description = 'MINO - Neural Link HUD'
$lnk.Save()
Write-Host 'Start Menu shortcut created: MINO'

if ($Startup) {
    $lnk2 = $shell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\MINO.lnk")
    $lnk2.TargetPath = $launcher
    $lnk2.WorkingDirectory = $root
    $lnk2.Description = 'MINO - starts with Windows'
    $lnk2.Save()
    Write-Host 'Startup entry created: MINO launches at login.'
}
Write-Host "Done. Launch MINO from the Start Menu (or run start_mino.bat directly)."
