param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [Parameter(Mandatory = $true)]
    [string]$MappingPath,

    [switch]$WhatIf,

    [switch]$InPlace,

    [string]$OutputPath,

    [int]$JsonDepth = 100,

    [switch]$NoBackup,

    [string]$AuditCsvPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function New-Backup {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $backupPath = "$Path.bak.$((Get-Date).ToString('yyyyMMddHHmmss'))"
    Copy-Item -Path $Path -Destination $backupPath -Force
    return $backupPath
}

function Get-ChildValue {
    param(
        [Parameter(Mandatory = $true)]$Object,
        [Parameter(Mandatory = $true)][string]$Token
    )

    if ($Object -is [System.Collections.IList]) {
        if ($Token -notmatch '^\d+$') {
            throw "Expected numeric token for array access, got '$Token'."
        }
        return $Object[[int]$Token]
    }

    if ($Object -is [System.Collections.IDictionary]) {
        return $Object[$Token]
    }

    $property = $Object.PSObject.Properties[$Token]
    if ($null -eq $property) {
        throw "Property '$Token' not found while resolving path."
    }
    return $property.Value
}

function Set-ChildValue {
    param(
        [Parameter(Mandatory = $true)]$Object,
        [Parameter(Mandatory = $true)][string]$Token,
        [Parameter(Mandatory = $true)]$Value
    )

    if ($Object -is [System.Collections.IList]) {
        if ($Token -notmatch '^\d+$') {
            throw "Expected numeric token for array access, got '$Token'."
        }
        $Object[[int]$Token] = $Value
        return
    }

    if ($Object -is [System.Collections.IDictionary]) {
        $Object[$Token] = $Value
        return
    }

    $property = $Object.PSObject.Properties[$Token]
    if ($null -eq $property) {
        throw "Property '$Token' not found while setting path."
    }
    $property.Value = $Value
}

function Split-PathTokens {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    # Supports tokens like nodes[1].parameters.assignments.assignments[2].value
    $tokens = @()
    $parts = $Path -split '\.'

    foreach ($part in $parts) {
        if ($part -match '^[^\[]+(\[\d+\])*$') {
            $name = ($part -replace '\[\d+\]', '')
            if ($name) {
                $tokens += $name
            }

            $indexes = [regex]::Matches($part, '\[(\d+)\]')
            foreach ($m in $indexes) {
                $tokens += $m.Groups[1].Value
            }
        } else {
            throw "Unsupported path segment '$part' in path '$Path'."
        }
    }

    return $tokens
}

function Set-ByPath {
    param(
        [Parameter(Mandatory = $true)]$Root,
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)]$Replacement
    )

    $tokens = Split-PathTokens -Path $Path
    if ($tokens.Count -eq 0) {
        throw "Path '$Path' did not produce valid tokens."
    }

    $current = $Root
    for ($i = 0; $i -lt $tokens.Count - 1; $i++) {
        $current = Get-ChildValue -Object $current -Token $tokens[$i]
    }

    $lastToken = $tokens[$tokens.Count - 1]
    $before = Get-ChildValue -Object $current -Token $lastToken

    Set-ChildValue -Object $current -Token $lastToken -Value $Replacement

    return [pscustomobject]@{
        Scope       = "path"
        Identifier  = $Path
        BeforeValue = $before
        AfterValue  = $Replacement
    }
}

function Apply-KeyMappings {
    param(
        [AllowNull()]$Node,
        [Parameter(Mandatory = $true)]$Mapping,
        [AllowEmptyString()][string]$CurrentPath = ""
    )

    $changes = @()

    if ($null -eq $Node) {
        return $changes
    }

    if ($Node -is [System.Collections.IList]) {
        for ($i = 0; $i -lt $Node.Count; $i++) {
            $childPath = if ($CurrentPath) { "$CurrentPath[$i]" } else { "[$i]" }
            $changes += Apply-KeyMappings -Node $Node[$i] -Mapping $Mapping -CurrentPath $childPath
        }
        return $changes
    }

    if ($Node -is [System.Collections.IDictionary]) {
        foreach ($k in @($Node.Keys)) {
            $childPath = if ($CurrentPath) { "$CurrentPath.$k" } else { "$k" }

            if ($Mapping.ContainsKey($k)) {
                $before = $Node[$k]
                $Node[$k] = $Mapping[$k]
                $changes += [pscustomobject]@{
                    Scope       = "key"
                    Identifier  = $k
                    BeforeValue = $before
                    AfterValue  = $Mapping[$k]
                    Path        = $childPath
                }
            }

            $changes += Apply-KeyMappings -Node $Node[$k] -Mapping $Mapping -CurrentPath $childPath
        }
        return $changes
    }

    $properties = $Node.PSObject.Properties
    foreach ($prop in $properties) {
        $k = $prop.Name
        $childPath = if ($CurrentPath) { "$CurrentPath.$k" } else { "$k" }

        if ($Mapping.ContainsKey($k)) {
            $before = $prop.Value
            $prop.Value = $Mapping[$k]
            $changes += [pscustomobject]@{
                Scope       = "key"
                Identifier  = $k
                BeforeValue = $before
                AfterValue  = $Mapping[$k]
                Path        = $childPath
            }
        }

        $changes += Apply-KeyMappings -Node $prop.Value -Mapping $Mapping -CurrentPath $childPath
    }

    return $changes
}

function To-Hashtable {
    param([Parameter(Mandatory = $true)]$Object)

    $result = @{}
    foreach ($p in $Object.PSObject.Properties) {
        $result[$p.Name] = $p.Value
    }
    return $result
}

if (-not (Test-Path -Path $FilePath)) {
    throw "File not found: $FilePath"
}

if (-not (Test-Path -Path $MappingPath)) {
    throw "Mapping file not found: $MappingPath"
}

$rawMapping = Get-Content -Raw -Path $MappingPath | ConvertFrom-Json
$keyMappings = @{}
$pathMappings = @{}

if ($rawMapping.PSObject.Properties["keyMappings"]) {
    $keyMappings = To-Hashtable -Object $rawMapping.keyMappings
}

if ($rawMapping.PSObject.Properties["pathMappings"]) {
    $pathMappings = To-Hashtable -Object $rawMapping.pathMappings
}

if ($keyMappings.Count -eq 0 -and $pathMappings.Count -eq 0) {
    throw "Mapping file has no keyMappings or pathMappings entries."
}

$workflow = Get-Content -Raw -Path $FilePath | ConvertFrom-Json
$changes = @()

# Apply path mappings first (exact and safest).
foreach ($entry in $pathMappings.GetEnumerator()) {
    $changes += Set-ByPath -Root $workflow -Path $entry.Key -Replacement $entry.Value
}

# Apply key mappings next (broad replacement).
if ($keyMappings.Count -gt 0) {
    $changes += Apply-KeyMappings -Node $workflow -Mapping $keyMappings -CurrentPath ""
}

$backupPath = $null
if (-not $NoBackup) {
    $backupPath = New-Backup -Path $FilePath
}

$targetPath = $FilePath
if ($OutputPath) {
    $targetPath = $OutputPath
} elseif (-not $InPlace) {
    $mappedName = "{0}.mapped{1}" -f [System.IO.Path]::GetFileNameWithoutExtension($FilePath), [System.IO.Path]::GetExtension($FilePath)
    $targetPath = [System.IO.Path]::Combine(
        [System.IO.Path]::GetDirectoryName($FilePath),
        $mappedName
    )
}

Write-Host "Planned changes: $($changes.Count)"
$changes | Select-Object Scope, Identifier, Path, BeforeValue, AfterValue | Format-Table -AutoSize

if ($AuditCsvPath) {
    $changes | Select-Object Scope, Identifier, Path, BeforeValue, AfterValue |
        Export-Csv -Path $AuditCsvPath -NoTypeInformation -Encoding UTF8
    Write-Host "Audit CSV written: $AuditCsvPath"
}

if ($WhatIf) {
    Write-Host "WhatIf mode: no JSON output written."
    if ($backupPath) {
        Write-Host "Backup created: $backupPath"
    }
    return
}

$jsonOut = $workflow | ConvertTo-Json -Depth $JsonDepth
Set-Content -Path $targetPath -Value $jsonOut -Encoding UTF8

if ($backupPath) {
    Write-Host "Backup created: $backupPath"
}
Write-Host "Updated JSON written to: $targetPath"
