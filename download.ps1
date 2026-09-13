$ErrorActionPreference = "Stop"
$Dest = Join-Path $PSScriptRoot "data"
$Base = "https://storage.googleapis.com/flyem-male-cns/v1.0/connectome-data/flat-connectome"
New-Item -ItemType Directory -Force -Path $Dest | Out-Null

$Files = @(
    @{ Name = "body-annotations-male-cns-v1.0-minconf-0.5.feather"; Size = 14483314 }
    @{ Name = "body-neurotransmitters-male-cns-v1.0.feather"; Size = 43282834 }
    @{ Name = "connectome-weights-male-cns-v1.0-minconf-0.5-significant-only.feather"; Size = 502169298 }
    @{ Name = "body-stats-male-cns-v1.0-minconf-0.5.feather"; Size = 778062826 }
    @{ Name = "connectome-weights-male-cns-v1.0-minconf-0.5.feather"; Size = 1051241946 }
)

function Get-FileSize([string]$Path) {
    if (Test-Path $Path) { return [int64](Get-Item $Path).Length }
    return [int64]0
}

foreach ($File in $Files) {
    $Out = Join-Path $Dest $File.Name
    $Have = Get-FileSize $Out
    if ($Have -eq $File.Size) {
        Write-Host "OK $($File.Name) ($Have bytes)"
        continue
    }
    Write-Host "GET $($File.Name) ($Have / $($File.Size) bytes)"
    & curl.exe -L --retry 8 --retry-all-errors --retry-delay 3 -C - --fail --progress-bar -o $Out "$Base/$($File.Name)"
    if ($LASTEXITCODE -ne 0) {
        throw "curl failed ($LASTEXITCODE) for $($File.Name)"
    }
    $Have = Get-FileSize $Out
    if ($Have -ne $File.Size) {
        throw "size mismatch for $($File.Name): got $Have expected $($File.Size)"
    }
    Write-Host "OK $($File.Name)"
}

Write-Host "ALL_DONE"
