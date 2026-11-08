<#
  Vecinos · Arreglo de rutas largas para compilar React Native en Windows (se ejecuta UNA vez).

  Problema: el CMake 3.22.1 del SDK de Android trae ninja 1.10, que no admite rutas de más de
  260 caracteres ("Filename longer than 260 characters" / "ninja: error: mkdir").
  Arreglo:
    1. Activa las rutas largas de Windows (HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled = 1).
    2. Reemplaza ninja.exe del SDK por ninja 1.12.1, que sí las admite.
       Guarda el original como ninja-1.10-original.exe (para volver atrás: renombrarlo a ninja.exe).

  Uso (pide permiso de administrador solo):
    cd C:\v\app-movil
    powershell -ExecutionPolicy Bypass -File .\scripts\arreglar-rutas-largas.ps1
#>
$ErrorActionPreference = "Stop"

# --- Pedir permisos de administrador si hace falta (para el registro)
$esAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
  Write-Host "Pidiendo permiso de administrador (acepta el aviso de Windows)..." -ForegroundColor Yellow
  Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`""
  exit 0
}

Write-Host ""
Write-Host "=== 1. Rutas largas de Windows ===" -ForegroundColor Cyan
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" `
  -Value 1 -PropertyType DWORD -Force | Out-Null
$valor = (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem").LongPathsEnabled
Write-Host "  OK  LongPathsEnabled = $valor" -ForegroundColor Green

Write-Host ""
Write-Host "=== 2. ninja 1.12.1 en el SDK de Android ===" -ForegroundColor Cyan
$app = Split-Path -Parent $PSScriptRoot
$nuevo = Join-Path $app "node_modules\.vecinos-tmp\ninja-1.12.1.exe"
if (-not (Test-Path $nuevo)) {
  Write-Host "  Descargando ninja 1.12.1 desde GitHub..."
  $zip = Join-Path $env:TEMP "ninja-win.zip"
  Invoke-WebRequest "https://github.com/ninja-build/ninja/releases/download/v1.12.1/ninja-win.zip" -OutFile $zip
  Expand-Archive $zip -DestinationPath (Join-Path $env:TEMP "ninja-1.12.1") -Force
  $nuevo = Join-Path $env:TEMP "ninja-1.12.1\ninja.exe"
}
$verNuevo = (& $nuevo --version)
if ($verNuevo -ne "1.12.1") { Write-Host "  !!  El ninja nuevo no es 1.12.1 ($verNuevo)." -ForegroundColor Red; exit 1 }

$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$lp = Join-Path $app "android\local.properties"
if (Test-Path $lp) {
  $linea = Select-String -Path $lp -Pattern '^sdk\.dir=(.+)$' | Select-Object -First 1
  if ($linea) { $sdk = $linea.Matches[0].Groups[1].Value -replace '\\\\', '\' -replace '\\:', ':' -replace '/', '\' }
}
$carpetas = Get-ChildItem -Path (Join-Path $sdk "cmake") -Directory -ErrorAction SilentlyContinue
if (-not $carpetas) { Write-Host "  !!  No encontré $sdk\cmake. Instala CMake desde Android Studio > SDK Manager > SDK Tools." -ForegroundColor Red; exit 1 }
foreach ($c in $carpetas) {
  $destino = Join-Path $c.FullName "bin\ninja.exe"
  if (-not (Test-Path $destino)) { continue }
  $antes = (& $destino --version)
  if ($antes -eq "1.12.1") { Write-Host "  OK  $($c.Name): ya tiene ninja 1.12.1" -ForegroundColor Green; continue }
  $respaldo = Join-Path $c.FullName "bin\ninja-$antes-original.exe"
  if (-not (Test-Path $respaldo)) { Copy-Item $destino $respaldo }
  Copy-Item $nuevo $destino -Force
  Write-Host "  OK  $($c.Name): ninja $antes -> $(& $destino --version)  (respaldo: $respaldo)" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== 3. Limpieza de compilaciones C++ anteriores ===" -ForegroundColor Cyan
$cxx = @(
  (Join-Path $app "android\app\.cxx"),
  (Join-Path $app "android\app\build\intermediates\cxx")
)
Get-ChildItem (Join-Path $app "node_modules") -Directory -ErrorAction SilentlyContinue | ForEach-Object {
  $cxx += (Join-Path $_.FullName "android\.cxx")
}
foreach ($d in $cxx) { if (Test-Path $d) { Remove-Item $d -Recurse -Force -ErrorAction SilentlyContinue; Write-Host "  borrado $d" } }
Push-Location (Join-Path $app "android"); & .\gradlew.bat --stop | Out-Null; Pop-Location

Write-Host ""
Write-Host "Listo. Cierra ESTA ventana y, en una ventana de PowerShell NUEVA (normal), ejecuta:" -ForegroundColor Yellow
Write-Host "  cd $app" -ForegroundColor Yellow
Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\correr-android.ps1" -ForegroundColor Yellow
