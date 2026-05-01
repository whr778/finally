# Stop and remove the FinAlly container (Windows PowerShell).
# The named volume "finally-data" is preserved so the SQLite database survives.
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$ContainerName = "finally"

$existing = docker ps -a --format '{{.Names}}' | Where-Object { $_ -eq $ContainerName }
if ($existing) {
    Write-Host "Stopping container $ContainerName..."
    docker rm -f $ContainerName | Out-Null
    Write-Host "Stopped. Volume 'finally-data' preserved."
} else {
    Write-Host "No container named $ContainerName is running."
}
