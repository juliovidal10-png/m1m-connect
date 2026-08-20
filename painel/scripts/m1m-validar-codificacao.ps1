$ErrorActionPreference="Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
& node.exe ".\scripts\m1m-validar-codificacao-ast.cjs"
if($LASTEXITCODE -ne 0){ exit $LASTEXITCODE }
& npx.cmd tsc --noEmit
exit $LASTEXITCODE
