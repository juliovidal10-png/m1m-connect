from pathlib import Path
import ast,json,hashlib,zipfile,io,base64,subprocess
r=Path(__file__).resolve().parents[2]
tree=ast.parse((r/'tools/deletion/build-durable-receipt-r3.py').read_text())
s=next(n.value.value for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='script' for t in n.targets))
base='baa42d405754d4a1e4b8c4818713aaaeeb0155e5'
changed=subprocess.check_output(['git','diff','--name-only','HEAD'],cwd=r,text=True).splitlines()
assert all(p.startswith('painel/src/') for p in changed)
paths=sorted(set(changed+['painel/src/services/conversation-deletion-policy.ts','painel/tests/regression/conversation-deletion-scope-r5.mjs','painel/tests/regression/conversation-deletion-scope-policy.mjs','docs/proposals/exclusoes-conversas.sql','docs/proposals/recebimento-concorrente-revisao-proposta.sql','docs/proposals/recebimento-concorrente-revisao-rollback.sql']))
m={'base':base,'files':{p:hashlib.sha256((r/p).read_bytes()).hexdigest() for p in paths}}
mb=json.dumps(m,sort_keys=True,separators=(',',':')).encode();buf=io.BytesIO()
with zipfile.ZipFile(buf,'w',zipfile.ZIP_DEFLATED) as z:
 for p in paths:z.writestr(p,(r/p).read_bytes())
 z.writestr('deletion-manifest.json',mb)
s=s.replace('33a6c41e1acd3ad0d964c9b3741cc22930a2b653',base).replace('M1M_RECEBIMENTO_DURAVEL_R3_1_','M1M_PROTECAO_RESTRITA_R5_').replace('RECEBIMENTO DURAVEL R3.1','PROTECAO E ATIVACAO RESTRITA R5').replace('VALIDACAO ISOLADA R3.1','VALIDACAO ISOLADA R5')
a=s.index("  Write-Host 'Revalidando repositorio");b=s.index('  $appLines=',a)
s=s[:a]+"  & $node 'tests\\regression\\conversation-deletion-scope-policy.mjs';Check-Native 'Politica de escopo'\n  Write-Host 'Testando escopo, pausa e protecao apos reinicios reais. Pode levar alguns minutos.'\n"+s[b:]
s=s.replace("'tests\\regression\\conversation-deletion-integration.mjs'","'tests\\regression\\conversation-deletion-scope-r5.mjs'")
s=s.replace('$appResult.restart.pendingRecovered -ne $true -or $appResult.persistenceFailureHttpStatus -ne 500',"$appResult.operation -ne 'DELETION_SCOPED_PROTECTION_R5' -or $appResult.restarts -lt 6")
s=s.replace("$report.Add('R2.6/R2.7 preservados; esta rodada testa recebimento duravel, reinicio real do Next e falha de persistencia. Sem navegador ou Evolution reais.')","$report.Add('R3.1 e R4 reaproveitados. Esta rodada testa somente escopo/pausa/protecao e reinicios. Sem navegador ou WhatsApp reais; nenhum schema novo.')")
s=s.replace('__SNAPSHOT__',hashlib.sha256(mb).hexdigest()).replace('__PAYLOAD__',base64.b64encode(buf.getvalue()).decode()).replace('__SQL__',m['files']['docs/proposals/exclusoes-conversas.sql']).replace('__EXTENSION__',m['files']['docs/proposals/recebimento-concorrente-revisao-proposta.sql']).replace('__ROLLBACK__',m['files']['docs/proposals/recebimento-concorrente-revisao-rollback.sql'])
(r/'tools/deletion/M1M_PROTECAO_RESTRITA_ISOLADA_R5.ps1').write_text(s,encoding='utf-8-sig')
(r/'docs/proposals/protecao-restrita-r5-manifest.json').write_bytes(mb)
print(json.dumps({'snapshot':hashlib.sha256(mb).hexdigest(),'files':len(paths),'base':base}))
