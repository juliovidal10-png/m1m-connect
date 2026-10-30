"""Empacota somente a unidade de exclusao. Nao publica nem executa SQL."""
from pathlib import Path
import subprocess,hashlib,io,zipfile,json,base64
root=Path(__file__).resolve().parents[2]
tracked=subprocess.check_output(['git','diff','--name-only','HEAD'],cwd=root,text=True).splitlines()
new=['docs/proposals/exclusoes-conversas.sql','docs/proposals/recebimento-concorrente-revisao-proposta.sql','docs/proposals/recebimento-concorrente-revisao-rollback.sql','painel/tests/regression/concurrent-receipt-durable-database.mjs']
paths=sorted(set(tracked+new))
assert all(p.startswith(('painel/src/','painel/prisma/','painel/tests/','docs/proposals/')) for p in paths)
files={p:(root/p).read_bytes() for p in paths}
manifest={'base':'33a6c41e1acd3ad0d964c9b3741cc22930a2b653','files':{p:hashlib.sha256(content).hexdigest() for p,content in files.items()}}
manifest_bytes=json.dumps(manifest,sort_keys=True,separators=(',',':')).encode()
snapshot=hashlib.sha256(manifest_bytes).hexdigest()
buf=io.BytesIO()
with zipfile.ZipFile(buf,'w',zipfile.ZIP_DEFLATED) as z:
 for p,b in files.items():z.writestr(p,b)
 z.writestr('deletion-manifest.json',manifest_bytes)
payload=base64.b64encode(buf.getvalue()).decode()
script=r'''param([switch]$ExecutarIntegracaoIsolada,[string]$Projeto=(Join-Path $env:USERPROFILE 'm1m-connect'))
$ErrorActionPreference='Stop'
if(-not $ExecutarIntegracaoIsolada){throw 'Use -ExecutarIntegracaoIsolada. Nao utiliza Coolify.'}
$id=[guid]::NewGuid().ToString('N')
$container='m1m-delete-r2-'+$id
$coreDb='m1m_delete_r3core_'+$id
$appDb='m1m_delete_r3app_'+$id
$password=[guid]::NewGuid().ToString('N')
$tempRoot=Join-Path ([IO.Path]::GetTempPath()) ('m1m-delete-r2-'+$id)
$work=Join-Path $tempRoot 'source'
$desktop=[Environment]::GetFolderPath('Desktop')
if(-not $desktop -or -not(Test-Path -LiteralPath $desktop)){throw 'Area de Trabalho nao localizada.'}
$reportPath=Join-Path $desktop ('M1M_RECEBIMENTO_DURAVEL_R3_1_'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.txt')
$report=New-Object 'System.Collections.Generic.List[string]'
$report.Add('M1M | EXCLUSAO INDIVIDUAL E REVISAO | RECEBIMENTO DURAVEL R3.1')
$report.Add('Base: 33a6c41e1acd3ad0d964c9b3741cc22930a2b653')
$report.Add('Candidato SHA256: __SNAPSHOT__')
$report.Add('SQL original SHA256: __SQL__')
$report.Add('SQL dois CHECKs SHA256: __EXTENSION__')
$report.Add('SQL rollback SHA256: __ROLLBACK__')
$report.Add('Dados sinteticos; provedor WhatsApp FAKE em loopback. Sem Evolution/WhatsApp reais.')
$report.Add('Sem alteracao de .env, banco compartilhado, commit, push, merge ou deploy.')
$keys=@('DATABASE_URL','M1M_DELETION_PG_TEST_URL','M1M_DELETION_ISOLATED','M1M_DELETION_REQUIRE_BASE','M1M_DELETION_BASELINE_SQL','M1M_DELETION_BROWSER','M1M_DELETION_PLAYWRIGHT_MODULE','M1M_DELETION_BROWSER_CHANNEL','M1M_DELETION_EMBEDDED','M1M_DELETION_GLOBAL_ONLY','M1M_DELETION_CONCURRENCY_ONLY','M1M_DURABLE_RECEIPT_ONLY','M1M_TF3A_UNREAD_LEDGER_ENABLED')
$previous=@{};foreach($key in $keys){$previous[$key]=[Environment]::GetEnvironmentVariable($key,'Process')}
$created=$false;$success=$false
function Check-Native([string]$stage){if($LASTEXITCODE -ne 0){throw ($stage+' falhou; codigo '+$LASTEXITCODE)}}
try{
 $node=(Get-Command node.exe -ErrorAction Stop).Source
 $docker=(Get-Command docker.exe -ErrorAction Stop).Source
 $git=(Get-Command git.exe -ErrorAction Stop).Source
 $npm=(Get-Command npm.cmd -ErrorAction Stop).Source
 $repo=(& $git -C $Projeto rev-parse --show-toplevel | Out-String).Trim();Check-Native 'Localizar projeto'
 $null=& $docker info --format '{{.ServerVersion}}';Check-Native 'Docker Desktop'
 New-Item -ItemType Directory -Path $tempRoot | Out-Null
 $overlay=Join-Path $tempRoot 'overlay.zip'
 [IO.File]::WriteAllBytes($overlay,[Convert]::FromBase64String('__PAYLOAD__'))
 $base='33a6c41e1acd3ad0d964c9b3741cc22930a2b653'
 $known=($base | & $git -C $repo cat-file --batch-check | Out-String).Trim();Check-Native 'Conferir base'
 if($known -match 'missing$'){$null=& $git -C $repo fetch --no-tags origin feat-exclusoes-operacionais-20261030;Check-Native 'Obter base remota sem alterar arquivos'}
 $baseZip=Join-Path $tempRoot 'base.zip'
 $null=& $git -C $repo archive --format=zip --output=$baseZip $base;Check-Native 'Copiar base fixa para teste'
 Expand-Archive -LiteralPath $baseZip -DestinationPath $work
 Expand-Archive -LiteralPath $overlay -DestinationPath $work -Force
 $manifestFile=Join-Path $work 'deletion-manifest.json'
 if((Get-FileHash -LiteralPath $manifestFile -Algorithm SHA256).Hash.ToLowerInvariant() -ne '__SNAPSHOT__'){throw 'Manifesto divergente.'}
 $manifest=Get-Content -LiteralPath $manifestFile -Raw | ConvertFrom-Json
 foreach($entry in $manifest.files.PSObject.Properties){if((Get-FileHash -LiteralPath (Join-Path $work $entry.Name) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.Value){throw ('Arquivo divergente: '+$entry.Name)}}
 # Nunca levar arquivos de ambiente do projeto para o teste.
 foreach($location in @($work,(Join-Path $work 'painel'))){foreach($file in @('.env','.env.local','.env.development','.env.development.local','.env.production','.env.production.local')){$candidate=Join-Path $location $file;if(Test-Path -LiteralPath $candidate){Remove-Item -LiteralPath $candidate -Force}}}
 # Dependencias apenas na copia descartavel. Nao usa nem altera node_modules do projeto original.
 $realModules=Join-Path $work 'painel\node_modules'
 Write-Host 'Instalando dependencias na copia temporaria pelo package-lock. Pode levar alguns minutos.'
 Push-Location (Join-Path $work 'painel')
 try{& $npm ci --ignore-scripts --no-audit --no-fund;Check-Native 'Instalar dependencias isoladas'}finally{Pop-Location}
 $probe=@'
const r=require('node:module').createRequire(process.argv[2]);
for(const name of ['pg','typescript','prisma/build/index.js','next/dist/bin/next','bcryptjs']){try{r.resolve(name);}catch{console.log('DEPENDENCIA_AUSENTE='+name);process.exitCode=1;}}
'@
 $probeLines=$probe | & $node - (Join-Path $work 'painel\package.json');$probeExit=$LASTEXITCODE
 foreach($line in $probeLines){$report.Add([string]$line)}
 if($probeExit -ne 0){throw 'Dependencia ausente apos instalacao isolada; veja o TXT.'}
 $created=$true
 Write-Host 'Criando PostgreSQL 16 descartavel; os dois bancos sao exclusivos deste teste.'
 $null=& $docker run --detach --rm --name $container --label ('m1m.deletion.test='+$id) --publish '127.0.0.1::5432' --tmpfs '/var/lib/postgresql/data:rw' --env 'POSTGRES_USER=synthetic_delete' --env ('POSTGRES_PASSWORD='+$password) --env ('POSTGRES_DB='+$coreDb) postgres:16;Check-Native 'Criar PostgreSQL'
 $inspect=@((& $docker inspect $container) | ConvertFrom-Json)[0];Check-Native 'Conferir container'
 if($inspect.Config.Labels.'m1m.deletion.test' -ne $id){throw 'Container nao pertence a este teste.'}
 $portText=(& $docker port $container '5432/tcp' | Out-String).Trim();Check-Native 'Conferir porta'
 if($portText -notmatch '^127\.0\.0\.1:(\d+)$'){throw 'Porta nao restrita a loopback.'};$portNumber=$Matches[1]
 $ready=$false;for($i=0;$i -lt 40;$i++){$null=& $docker exec $container pg_isready -h 127.0.0.1 -U synthetic_delete -d $coreDb;if($LASTEXITCODE -eq 0){$ready=$true;break};Start-Sleep -Milliseconds 500}
 if(-not $ready){throw 'PostgreSQL nao ficou pronto.'}
 # Prontidao TCP confirmada antes de usar o socket local para criar o segundo banco.
 # Guarda o erro nativo no TXT, sem interromper antes de registrar sua causa.
 $savedPreference=$ErrorActionPreference
 try{$ErrorActionPreference='Continue';$createLines=& $docker exec $container createdb -U synthetic_delete --maintenance-db $coreDb $appDb 2>&1;$createExit=$LASTEXITCODE}finally{$ErrorActionPreference=$savedPreference}
 if($createExit -ne 0){foreach($line in $createLines){$report.Add([string]$line)};throw ('Criar banco isolado da aplicacao falhou; codigo '+$createExit)}
 $report.Add('Prontidao TCP confirmada; segundo banco isolado criado.')
 $report.Add('Imagem PostgreSQL: '+$inspect.Image)
 $env:M1M_DELETION_ISOLATED='1'
 $env:M1M_DELETION_PG_TEST_URL='postgresql://synthetic_delete:'+$password+'@127.0.0.1:'+$portNumber+'/'+$coreDb
 $env:DATABASE_URL='postgresql://synthetic_delete:'+$password+'@127.0.0.1:'+$portNumber+'/'+$appDb
 $env:M1M_DELETION_BASELINE_SQL=Join-Path $work 'painel\tests\fixtures\conversation-deletion-baseline.sql'
 $env:M1M_DELETION_REQUIRE_BASE=Join-Path $work 'painel\package.json'
 $env:M1M_DELETION_EMBEDDED='0'
 $env:M1M_TF3A_UNREAD_LEDGER_ENABLED='false'
 $env:M1M_DELETION_BROWSER='0'
 $env:M1M_DELETION_GLOBAL_ONLY='0'
 $env:M1M_DELETION_CONCURRENCY_ONLY='0'
 $env:M1M_DURABLE_RECEIPT_ONLY='1'
 $report.Add('R2.6/R2.7 preservados; esta rodada testa recebimento duravel, reinicio real do Next e falha de persistencia. Sem navegador ou Evolution reais.')
 Push-Location (Join-Path $work 'painel')
 try{
  Write-Host 'Gerando cliente Prisma apenas na copia temporaria.'
  & $node (Join-Path $realModules 'prisma\build\index.js') generate;Check-Native 'Gerar cliente isolado'
  & $node (Join-Path $realModules 'typescript\bin\tsc') --noEmit --incremental false;Check-Native 'TypeScript do candidato'
  Write-Host 'Revalidando repositorio alterado em PostgreSQL 16 real.'
  $coreLines=& $node 'tests\regression\conversation-deletion-database.mjs';$coreExit=$LASTEXITCODE;$coreText=$coreLines -join [Environment]::NewLine;$report.Add($coreText)
  if($coreExit -ne 0){throw 'Falha na regressao do repositorio; veja o TXT.'}
  $coreResult=$coreText | ConvertFrom-Json
  if($coreResult.status -ne 'PASSED' -or $coreResult.postgresServerReal -ne $true){throw 'Repositorio nao aprovado.'}
  Write-Host 'Executando recebimento duravel, reinicio da aplicacao e falha real de gravacao. Pode levar alguns minutos.'
  $appLines=& $node 'tests\regression\conversation-deletion-integration.mjs';$appExit=$LASTEXITCODE;$appText=$appLines -join [Environment]::NewLine;$report.Add($appText)
  if($appExit -ne 0){throw 'Falha na integracao; veja o TXT.'}
  $appResult=$appText | ConvertFrom-Json
  if($appResult.status -ne 'PASSED' -or $appResult.postgresServerReal -ne $true -or $appResult.authenticationReal -ne $true -or $appResult.sqlSha256 -ne '__SQL__' -or $appResult.extensionSqlSha256 -ne '__EXTENSION__' -or $appResult.restart.pendingRecovered -ne $true -or $appResult.persistenceFailureHttpStatus -ne 500 -or $appResult.temporaryProcessesStopped -ne $true){throw 'Integracao completa nao aprovada.'}
  $success=$true
 }finally{Pop-Location}
}catch{
 $report.Add('INTERROMPIDO: '+$_.Exception.Message);Write-Host ('INTERROMPIDO: '+$_.Exception.Message)
}finally{
 foreach($key in $keys){[Environment]::SetEnvironmentVariable($key,$previous[$key],'Process')}
 if($created){try{$inspect=@((& $docker inspect $container) | ConvertFrom-Json)[0];if($inspect.Config.Labels.'m1m.deletion.test' -ne $id){throw 'Propriedade do container divergente; nao remover.'};$null=& $docker rm --force --volumes $container;Check-Native 'Remover container';$report.Add('Container e armazenamento temporario removidos.')}catch{$report.Add('PENDENCIA DE LIMPEZA: '+$_.Exception.Message);$success=$false}}
 if(Test-Path -LiteralPath $tempRoot){try{Remove-Item -LiteralPath $tempRoot -Recurse -Force}catch{$success=$false;$report.Add('PENDENCIA TEMPORARIA: '+$tempRoot)}}
 $report.Add('Sem acesso a Evolution/WhatsApp reais; nenhum merge ou deploy.')
 $report | Set-Content -LiteralPath $reportPath -Encoding UTF8
 Write-Host ('TXT unico na Area de Trabalho: '+$reportPath)
}
if(-not $success){exit 1}
Write-Host 'VALIDACAO ISOLADA R3.1 CONCLUIDA. Envie somente o TXT da Area de Trabalho.'
'''
script=script.replace('__SNAPSHOT__',snapshot).replace('__SQL__',manifest['files']['docs/proposals/exclusoes-conversas.sql']).replace('__EXTENSION__',manifest['files']['docs/proposals/recebimento-concorrente-revisao-proposta.sql']).replace('__ROLLBACK__',manifest['files']['docs/proposals/recebimento-concorrente-revisao-rollback.sql']).replace('__PAYLOAD__',payload)
(root/'tools/deletion/M1M_RECEBIMENTO_DURAVEL_ISOLADO_R3_1.ps1').write_text(script,encoding='utf-8-sig')
(root/'docs/proposals/recebimento-duravel-r3-manifest.json').write_bytes(manifest_bytes)
print(json.dumps({'snapshotSha256':snapshot,'files':len(paths),'ps1Bytes':len(script)}))
