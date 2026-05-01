# Start the FinAlly container (Windows PowerShell).
# Idempotent: builds the image if missing, replaces a running container if present.
[CmdletBinding()]
param(
    [switch]$Build,
    [switch]$Open
)

$ErrorActionPreference = "Stop"

$ImageName     = "finally:latest"
$ContainerName = "finally"
$VolumeName    = "finally-data"
$Port = if ($env:FINALLY_PORT) { $env:FINALLY_PORT } else { "8000" }

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "No .env found; copying .env.example -> .env"
        Copy-Item ".env.example" ".env"
    } else {
        Write-Warning "No .env or .env.example found; container will run without env vars"
    }
}

$imageExists = $true
docker image inspect $ImageName *> $null
if ($LASTEXITCODE -ne 0) { $imageExists = $false }

if ($Build -or -not $imageExists) {
    Write-Host "Building image $ImageName..."
    docker build -t $ImageName .
    if ($LASTEXITCODE -ne 0) { throw "docker build failed" }
}

$existing = docker ps -a --format '{{.Names}}' | Where-Object { $_ -eq $ContainerName }
if ($existing) {
    Write-Host "Removing existing container $ContainerName..."
    docker rm -f $ContainerName | Out-Null
}

$envArgs = @()
if (Test-Path ".env") {
    $envArgs = @("--env-file", ".env")
}

Write-Host "Starting container $ContainerName on port $Port..."
docker run -d `
    --name $ContainerName `
    -p "${Port}:8000" `
    -v "${VolumeName}:/app/db" `
    @envArgs `
    $ImageName | Out-Null

$Url = "http://localhost:$Port"
Write-Host "FinAlly is starting: $Url"

if ($Open) {
    Start-Process $Url
}
