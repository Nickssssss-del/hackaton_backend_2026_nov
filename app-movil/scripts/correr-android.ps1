<#
  Vecinos · Compilar, instalar y abrir la app en Android (teléfono por USB o emulador de Android Studio).

  Uso, desde PowerShell:
    cd C:\v\app-movil
    powershell -ExecutionPolicy Bypass -File .\scripts\correr-android.ps1

  Opciones:
    -SoloServidor   No compila: solo abre el servidor (cuando la app ya está instalada).
    -Apk            Genera un APK independiente (no necesita PC ni servidor), lo instala en el
                    dispositivo conectado y lo copia al Escritorio como Vecinos.apk. Para presentar.
    -Compartir      Genera un APK para ENVIAR a otras personas (WhatsApp, Drive). No necesita
                    teléfono conectado. Sirve para casi todos los Android (arm64-v8a y armeabi-v7a).
                    Revisa antes que exista .env con Supabase (si no, la app no se conecta a nada).
                    Lo deja en el Escritorio como Kuna-AAAA-MM-DD.apk.
    -Limpiar        Ejecuta "gradlew clean" antes de compilar (no usa prebuild).
    -RutaCorta      Compila desde V:\app-movil (subst V: = carpeta del repositorio) para evitar el límite de 260 caracteres.
                    Para quitar la unidad V: después:  subst V: /D

  Todo lo que aparece en pantalla se guarda en:
    app-movil\node_modules\.vecinos-tmp\log-android.txt   (git lo ignora)
#>
param(
  [switch]$SoloServidor,
  [switch]$Apk,
  [switch]$Compartir,
  [switch]$Limpiar,
  [switch]$RutaCorta
)

$ErrorActionPreference = "Continue"
$app = Split-Path -Parent $PSScriptRoot
if ($RutaCorta) {
  # V: apunta a la carpeta del repositorio y se compila desde V:\app-movil (evita el límite de 260
  # caracteres de Windows). No se usa la raíz V:\ porque el autolinking de Expo falla en la raíz de una unidad.
  $repo = Split-Path -Parent $app
  $hoja = Split-Path -Leaf $app
  subst V: /D 2>$null | Out-Null
  subst V: $repo | Out-Null
  if (-not (Test-Path "V:\$hoja\app\alta\index.tsx")) { Write-Host "No se pudo crear la unidad V:. ¿Está ocupada por otro disco?" -ForegroundColor Red; exit 1 }
  $app = "V:\$hoja"
  Write-Host "Usando ruta corta: $app  (V: = $repo)"
}
Set-Location $app
$carpetaLog = Join-Path $app "node_modules\.vecinos-tmp"
New-Item -ItemType Directory -Force $carpetaLog | Out-Null
$log = Join-Path $carpetaLog "log-android.txt"
Start-Transcript -Path $log -Force | Out-Null

function Paso($texto) { Write-Host ""; Write-Host "=== $texto ===" -ForegroundColor Cyan }
function Bien($texto) { Write-Host "  OK  $texto" -ForegroundColor Green }
function Mal($texto)  { Write-Host "  !!  $texto" -ForegroundColor Red }
function Terminar($codigo) { Stop-Transcript | Out-Null; exit $codigo }

# ---------------------------------------------------------------- 1. Proyecto
Paso "1. Proyecto"
if (-not (Test-Path ".\app\alta\index.tsx")) { Mal "No estoy en app-movil (falta app\alta\index.tsx)."; Terminar 1 }
$rama = (git branch --show-current) 2>$null
Bien "Carpeta: $app"
Bien "Rama: $rama"

# ---------------------------------------------------------------- 2. Node
Paso "2. Node.js (se necesita 22.13 o superior)"
$nodeVer = (node -v) 2>$null
if (-not $nodeVer) { Mal "Node no está instalado. Instálalo con: winget install OpenJS.NodeJS.LTS"; Terminar 1 }
$partes = $nodeVer.TrimStart("v").Split(".")
if ([int]$partes[0] -lt 22 -or ([int]$partes[0] -eq 22 -and [int]$partes[1] -lt 13)) {
  Mal "Tienes Node $nodeVer. Actualiza con: winget install OpenJS.NodeJS.LTS"; Terminar 1
}
Bien "Node $nodeVer"

# ---------------------------------------------------------------- 3. Java 17
Paso "3. Java 17 (lo exige React Native 0.88)"
function VersionJava($dir) {
  $exe = Join-Path $dir "bin\java.exe"
  if (-not (Test-Path $exe)) { return $null }
  $salida = (& $exe -version 2>&1) | Out-String
  if ($salida -match 'version "(\d+)') { return [int]$Matches[1] }
  return $null
}
$candidatos = @()
if ($env:JAVA_HOME) { $candidatos += $env:JAVA_HOME }
$patrones = @(
  "$env:ProgramFiles\Zulu\zulu-17*",
  "$env:ProgramFiles\Eclipse Adoptium\jdk-17*",
  "$env:ProgramFiles\Microsoft\jdk-17*",
  "$env:ProgramFiles\Java\jdk-17*",
  "$env:ProgramFiles\Amazon Corretto\jdk17*",
  "$env:USERPROFILE\.jdks\*17*",
  "$env:ProgramFiles\Android\Android Studio\jbr"
)
foreach ($p in $patrones) { Get-ChildItem -Path $p -Directory -ErrorAction SilentlyContinue | ForEach-Object { $candidatos += $_.FullName } }
if (Test-Path "$env:ProgramFiles\Android\Android Studio\jbr") { $candidatos += "$env:ProgramFiles\Android\Android Studio\jbr" }
$java17 = $null
foreach ($c in ($candidatos | Select-Object -Unique)) {
  $v = VersionJava $c
  Write-Host "  ... $c -> Java $v"
  if ($v -eq 17 -and -not $java17) { $java17 = $c }
}
if (-not $java17) {
  Mal "No encontré Java 17. Instálalo con:  winget install Microsoft.OpenJDK.17"
  Mal "Luego cierra y abre PowerShell y vuelve a ejecutar este script."
  Terminar 1
}
$env:JAVA_HOME = $java17
$env:Path = "$java17\bin;$env:Path"
Bien "JAVA_HOME = $java17"

# ---------------------------------------------------------------- 4. Android SDK
Paso "4. Android SDK"
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$lp = Join-Path $app "android\local.properties"
if (Test-Path $lp) {
  $linea = Select-String -Path $lp -Pattern '^sdk\.dir=(.+)$' | Select-Object -First 1
  if ($linea) { $sdk = $linea.Matches[0].Groups[1].Value -replace '\\\\', '\' -replace '\\:', ':' -replace '/', '\' }
}
if (-not (Test-Path "$sdk\platform-tools\adb.exe")) {
  Mal "No encontré el SDK en $sdk. Abre Android Studio > More Actions > SDK Manager e instala 'Android SDK Platform-Tools'."
  Terminar 1
}
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:Path = "$sdk\platform-tools;$sdk\emulator;$env:Path"
Bien "ANDROID_HOME = $sdk"

# ---------------------------------------------------------------- 5. Dispositivo
if ($Compartir) {
  Paso "5. APK para compartir: no hace falta teléfono conectado"
  $envArchivo = Join-Path $app ".env"
  $envTexto = if (Test-Path $envArchivo) { Get-Content $envArchivo -Raw } else { "" }
  if ($envTexto -notmatch "EXPO_PUBLIC_SUPABASE_URL=\S+" -or $envTexto -notmatch "EXPO_PUBLIC_SUPABASE_ANON_KEY=\S+") {
    Mal "Falta .env con EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY (copia .env.example a .env y llénalo)."
    Mal "Sin eso el APK no se conecta a Supabase: no habría ayuda, servicios, comunidad ni emergencia en la nube."
    Terminar 1
  }
  Bien ".env con Supabase encontrado (queda dentro del APK; solo la clave publicable, nunca la secreta)"
  if (-not (Test-Path (Join-Path $app "android\app\google-services.json"))) { Write-Host "  Aviso: falta android\app\google-services.json: el APK no recibirá avisos push." -ForegroundColor Yellow }
} else {
Paso "5. Teléfono o emulador"
adb start-server 2>&1 | Out-Host
function Dispositivos { (adb devices) | Select-Object -Skip 1 | Where-Object { $_ -match "\S+\s+(device|unauthorized|offline)$" } }
$lista = @(Dispositivos)
if ($lista | Where-Object { $_ -match "unauthorized" }) {
  Mal "El teléfono está 'unauthorized': acepta el aviso 'Permitir depuración USB' en la pantalla del teléfono y vuelve a ejecutar."
  Terminar 1
}
if (-not ($lista | Where-Object { $_ -match "\sdevice$" })) {
  Write-Host "  No hay teléfono conectado. Busco un emulador de Android Studio..."
  $avds = @((& "$sdk\emulator\emulator.exe" -list-avds) 2>$null | Where-Object { $_ -and $_ -notmatch "^INFO" })
  if ($avds.Count -eq 0) {
    Mal "No hay emuladores. En Android Studio: More Actions > Virtual Device Manager > Create device (Pixel 7, imagen Android 14 o 15)."
    Mal "O conecta tu teléfono por USB con la depuración USB activada."
    Terminar 1
  }
  $avd = $avds[0]
  Write-Host "  Abriendo el emulador '$avd' (la primera vez tarda 1-3 minutos)..."
  Start-Process -FilePath "$sdk\emulator\emulator.exe" -ArgumentList "-avd", $avd -WindowStyle Normal
  adb wait-for-device
  $espera = 0
  while ("$(adb shell getprop sys.boot_completed 2>$null)".Trim() -ne "1" -and $espera -lt 240) { Start-Sleep 3; $espera += 3 }
  if ($espera -ge 240) { Mal "El emulador no terminó de arrancar en 4 minutos. Ábrelo desde Android Studio y vuelve a ejecutar."; Terminar 1 }
}
adb devices 2>&1 | Out-Host
Bien "Dispositivo listo"
adb reverse tcp:8081 tcp:8081 2>&1 | Out-Host
# La app de desarrollo busca el servidor en "localhost": con adb reverse llega por el cable USB
# (evita el error "Failed to connect to /192.168.x.x:8081" cuando el Wi-Fi o el firewall lo bloquean).
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "localhost"

}

# ---------------------------------------------------------------- 6. Dependencias y código
Paso "6. Dependencias y revisión de TypeScript"
if (-not (Test-Path ".\node_modules\expo")) { npm install 2>&1 | Out-Host; if ($LASTEXITCODE -ne 0) { Mal "npm install falló."; Terminar 1 } }
npx tsc --noEmit 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) { Mal "TypeScript encontró errores (ver arriba)."; Terminar 1 }
Bien "TypeScript sin errores"

# ---------------------------------------------------------------- 7. Compilar o servir
if ($Compartir) {
  Paso "7. APK para compartir (release, arm64-v8a + armeabi-v7a). La primera vez: 10-30 minutos"
  Push-Location android
  .\gradlew.bat assembleRelease "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a" 2>&1 | Out-Host
  $codigoApk = $LASTEXITCODE
  Pop-Location
  $apkSalida = Join-Path $app "android\app\build\outputs\apk\release\app-release.apk"
  if ($codigoApk -ne 0 -or -not (Test-Path $apkSalida)) { Mal "No se generó el APK. El detalle quedó en: $log"; Terminar 1 }
  $nombre = "Kuna-$(Get-Date -Format 'yyyy-MM-dd').apk"
  $destino = Join-Path ([Environment]::GetFolderPath("Desktop")) $nombre
  Copy-Item $apkSalida $destino -Force
  $mb = [math]::Round((Get-Item $destino).Length / 1MB, 1)
  Bien "APK listo para enviar: $destino  ($mb MB)"
  Write-Host "  Para instalarlo, la otra persona abre el archivo y acepta 'Instalar apps de origen desconocido'."
  Write-Host "  Si ya tenía una versión instalada desde este PC por USB, primero debe desinstalarla."
  Terminar 0
}
if ($Apk) {
  Paso "7. APK independiente (release). La primera vez: 10-30 minutos"
  $abi = "$(adb shell getprop ro.product.cpu.abi 2>$null)".Trim()
  if (-not $abi) { $abi = "arm64-v8a" }
  Write-Host "  Arquitectura del dispositivo: $abi"
  Push-Location android
  .\gradlew.bat assembleRelease "-PreactNativeArchitectures=$abi" 2>&1 | Out-Host
  $codigoApk = $LASTEXITCODE
  Pop-Location
  $apkSalida = Join-Path $app "android\app\build\outputs\apk\release\app-release.apk"
  if ($codigoApk -ne 0 -or -not (Test-Path $apkSalida)) { Mal "No se generó el APK. El detalle quedó en: $log"; Terminar 1 }
  $destino = Join-Path ([Environment]::GetFolderPath("Desktop")) "Vecinos.apk"
  Copy-Item $apkSalida $destino -Force
  Bien "APK listo: $destino"
  adb install -r $apkSalida 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  La instalación falló. Si dice INSTALL_FAILED_UPDATE_INCOMPATIBLE, ejecuta:"
    Write-Host "    adb uninstall com.melllfer.proyectobarrio   y vuelve a correr con -Apk"
    Terminar 1
  }
  adb shell monkey -p com.melllfer.proyectobarrio -c android.intent.category.LAUNCHER 1 2>&1 | Out-Null
  Bien "Instalado y abierto. Funciona sin PC: también puedes pasar Vecinos.apk a otro teléfono."
  Terminar 0
}
if ($SoloServidor) {
  Paso "7. Servidor (la app ya está instalada). Abre 'Proyecto Barrio' en el dispositivo."
  Write-Host "  Para detener: Ctrl + C"
  Write-Host "  Si en el teléfono aparece la pantalla de Expo, toca 'http://localhost:8081' o escríbelo."
  npx expo start --dev-client --localhost 2>&1 | Out-Host
  Terminar 0
}
if ($Limpiar) {
  Paso "7a. Limpieza de Android (gradlew clean)"
  Push-Location android; .\gradlew.bat clean 2>&1 | Out-Host; Pop-Location
}
Paso "7. Compilar, instalar y abrir (la primera vez: 10-30 minutos)"
Write-Host "  Al terminar, la app 'Proyecto Barrio' se abre sola. Deja esta ventana abierta: es el servidor."
Write-Host "  Para detener: Ctrl + C"
# "| Out-Host" hace que la salida de Gradle quede también en el registro.
npx expo run:android 2>&1 | Out-Host
$codigo = $LASTEXITCODE
if ($codigo -ne 0) {
  Mal "La compilación falló. El detalle quedó en: $log"
  Mal "Avísale a Claude: puede leer ese archivo directamente."
  if ((Get-Content $log -Raw) -match "longer than|260|path too long|Filename longer|ninja: error|CMake") {
    Mal "Parece un problema de rutas largas. Prueba:  powershell -ExecutionPolicy Bypass -File .\scripts\correr-android.ps1 -RutaCorta"
  }
}
Terminar $codigo
