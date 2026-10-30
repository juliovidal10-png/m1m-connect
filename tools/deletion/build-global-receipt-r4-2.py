from pathlib import Path
import ast,json,hashlib,zipfile,io,base64
r=Path(__file__).resolve().parents[2]
tree=ast.parse((r/'tools/deletion/build-durable-receipt-r3.py').read_text())
s=next(n.value.value for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='script' for t in n.targets))
base='6934c47997d74bf8a755261e7af6ee06d5e84f46'
p='painel/tests/regression/conversation-deletion-global-r4-2.mjs'
paths=[p,'docs/proposals/exclusoes-conversas.sql','docs/proposals/recebimento-concorrente-revisao-proposta.sql','docs/proposals/recebimento-concorrente-revisao-rollback.sql']
m={'base':base,'files':{p:hashlib.sha256((r/p).read_bytes()).hexdigest() for p in paths}}
mb=json.dumps(m,sort_keys=True,separators=(',',':')).encode();buf=io.BytesIO()
with zipfile.ZipFile(buf,'w',zipfile.ZIP_DEFLATED) as z:
 for p in paths:z.writestr(p,(r/p).read_bytes())
 z.writestr('deletion-manifest.json',mb)
s=s.replace('33a6c41e1acd3ad0d964c9b3741cc22930a2b653',base).replace('M1M_RECEBIMENTO_DURAVEL_R3_1_','M1M_REVISAO_VISUAL_R4_2_').replace('RECEBIMENTO DURAVEL R3.1','REVISAO VISUAL R4.2').replace('VALIDACAO ISOLADA R3.1','VALIDACAO VISUAL R4')
s=s.replace("$env:M1M_DELETION_BROWSER='0'","$env:M1M_DELETION_BROWSER='1'")
a=s.index("  Write-Host 'Revalidando repositorio")
b=s.index("  $appLines=",a)
s=s[:a]+"  Write-Host 'Executando somente navegador R4 com login real e eventos sinteticos. Aguarde o TXT.'\n"+s[b:]
s=s.replace("'tests\\regression\\conversation-deletion-integration.mjs'","'tests\\regression\\conversation-deletion-global-r4-2.mjs'")
s=s.replace("$appResult.restart.pendingRecovered -ne $true -or $appResult.persistenceFailureHttpStatus -ne 500","$appResult.browserReal -ne $true -or $appResult.operation -ne 'DURABLE_RECEIPT_BROWSER_R4'")
s=s.replace(" $report.Add('R2.6/R2.7 preservados; esta rodada testa recebimento duravel, reinicio real do Next e falha de persistencia. Sem navegador ou Evolution reais.')"," $report.Add('R3.1 PostgreSQL/API e R2.6/R2.7 navegador anteriores reaproveitados, sem repetir bateria. Esta rodada: navegador R4, eventos sinteticos, nenhum WhatsApp real.')")
anchor=" $probe=@'"
setup=""" $browserChannel=$null
 foreach($candidate in @(@('chrome',(Join-Path $env:ProgramFiles 'Google\\Chrome\\Application\\chrome.exe')),@('chrome',(Join-Path ${env:ProgramFiles(x86)} 'Google\\Chrome\\Application\\chrome.exe')),@('msedge',(Join-Path ${env:ProgramFiles(x86)} 'Microsoft\\Edge\\Application\\msedge.exe')),@('msedge',(Join-Path $env:ProgramFiles 'Microsoft\\Edge\\Application\\msedge.exe')))) {if(Test-Path -LiteralPath $candidate[1]){$browserChannel=$candidate[0];break}}
 if(-not $browserChannel){throw 'Chrome ou Edge instalado nao encontrado; nenhum navegador sera baixado.'}
 $pwRoot=Join-Path $tempRoot 'playwright'
 New-Item -ItemType Directory -Path $pwRoot | Out-Null
 & $npm install --prefix $pwRoot --ignore-scripts --no-audit --no-fund playwright@1.56.1;Check-Native 'Preparar controlador Playwright isolado'
 $env:M1M_DELETION_PLAYWRIGHT_MODULE=Join-Path $pwRoot 'node_modules\\playwright'
 $env:M1M_DELETION_BROWSER_CHANNEL=$browserChannel
 $report.Add('Navegador real isolado: '+$browserChannel+'; controlador Playwright 1.56.1; sem baixar navegador.')
"""
s=s.replace(anchor,setup+anchor)
s=s.replace('__SNAPSHOT__',hashlib.sha256(mb).hexdigest()).replace('__PAYLOAD__',base64.b64encode(buf.getvalue()).decode()).replace('__SQL__',m['files'][paths[1]]).replace('__EXTENSION__',m['files'][paths[2]]).replace('__ROLLBACK__',m['files'][paths[3]])
(r/'tools/deletion/M1M_REVISAO_VISUAL_ISOLADA_R4_2.ps1').write_text(s,encoding='utf-8-sig')
print('Pacote R4 gerado:',len(s),'caracteres; base',base)
