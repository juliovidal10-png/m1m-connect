# R5 — ativação restrita e proteção após exclusão

## Estado
Branch feat-exclusoes-operacionais-20261030, HEAD local/remoto conferido baa42d405754d4a1e4b8c4818713aaaeeb0155e5. Produção não acessada. Working tree anterior sem alterações versionadas, auxiliares não relacionados preservados. Código R5 local não commitado.

## Configuração exata proposta — não aplicada
```
M1M_CONVERSATION_DELETION_ENABLED=true
M1M_CONVERSATION_DELETION_SCOPES=[{"companyId":"empresa-teste","instanceName":"M1MTesteIA"}]
```
A flag permite novas exclusões somente com array JSON válido de pares exatos. Sem wildcard, duplicatas, propriedades extras, espaços indevidos ou fallback global. Configuração ausente/inválida fecha todas as novas exclusões. Empresa e instância atuais são verificadas no banco pelo servidor; não existe hardcode de cliente na lógica. DELETE_CONVERSATIONS continua obrigatório além do escopo; administradores globais usam a empresa selecionada. Concessão nova da permissão também verifica escopo. Nenhuma configuração foi aplicada em ambiente compartilhado.

## Suspensão e preservação
M1M_CONVERSATION_DELETION_ENABLED=false suspende preparar/confirmar novas exclusões; não desliga proteção nem revisão persistida. Remover um par, invalidar/remover o JSON também não remove proteções anteriores. As três tabelas são detectadas por to_regclass; se ausentes, o caminho original permanece disponível sem exigir schema. Schema parcial falha explicitamente. Ausência de tabelas/estado não é cacheada. Com tabelas, escopo autorizado ou operações/revisões persistidas determinam a proteção; configurações não são a fonte de verdade do histórico excluído. Os guardas de importação, webhook, listagem, mídia, leitura, envio e ações de atendimento deixaram de depender do desligamento global. Escopos sem ativação nem registros continuam no fluxo original, sem bloqueio/captura de revisão. Consultas de verificação não são apresentadas como custo zero; nenhuma medição de desempenho compartilhado foi realizada.

Desativar novas operações é distinto de retirar o código ou reverter a versão. Não existe desligamento irrestrito da proteção de dados já excluídos. A versão antiga que ignora os manifestos não é rollback seguro após uso. Manter código leitor compatível, proteção, pendências e decisões; não apagar tabelas ou registros. Rollback SQL da extensão continua recusando qualquer CONCURRENT_RECEIPT inclusive decidido. A reversão de código/schema exige avaliação e autorização separadas; não executada.

## Arquivos
Novo services/conversation-deletion-policy.ts; alterações em conversation-deletion.service.ts, incoming-message-pipeline.service.ts, conversation-sync.service.ts, user.service.ts e APIs conversation-deletions, chat/list, chat/read, chat/media, chat/send, chat/send-media, customer-center/media, customers/assign, attendance/finish e attendance/transfer. Novo teste de política pura e executor de integração scope-r5; builder/PS1/manifest R5. Nenhum formulário, dependência, Prisma/schema ou SQL alterado.

## Validação
TypeScript passou. Política pura passou: pares exatos, empresas/instâncias diferentes, flag estrita, config ausente/inválida/wildcard/duplicada. Não equivale a banco real. Sintaxe Node, diff/check e ZIP/manifesto de 20 arquivos conferidos. Teste PostgreSQL/API real R5 preparado, não executado neste host sem Docker/PowerShell. R3.1 e R4 continuam evidências das versões anteriores, sem declarar que validam alterações R5.

R5 aplica os mesmos SQLs autorizados apenas em bancos novos sintéticos; não muda CHECKs ou schema. Testa A permitida/B negada, exclusão A, pausa e reinício real, bloqueio de prévia/confirmação anterior, sincronização/webhook não restaurando histórico, revisão/retomada/descarte com permissões, config ausente/inválida/wildcard/instância divergente após reinícios, reativação exata, B normal, decisões e isolamento persistidos. São seis reinícios reais do Next e eventos sintéticos/provedor fake. Sem navegador e sem Evolution/WhatsApp. Container/armazenamento/processos próprios encerrados/removidos ao finalizar; único TXT na Área de Trabalho.

## Publicação futura
SQL original 84a4c724d0f7ef80f7b6fb82072c67657accce93f26337eb87eb0863a12ac0c8, depois extensão a93790c9c4481a1c1b3eb52f303c7e4c1e830baa3a745f046c647866cd7b476e. Nenhum backfill novo. Verificar somente com autorização futura comando efetivo do Coolify e migrations pendentes; package.json contém npm start com prisma migrate deploy, mas isso não prova comando implantado. SQLs de docs/proposals não são executados automaticamente pelo migrate deploy. Antes de publicação: validar R5 real, conferir diff/main/produção e backup, obter autorizações separadas para registro, merge, SQL compartilhado e deploy manual. Publicar com novas operações desligadas, aplicar schema exato na ordem aprovada antes de habilitar; ordem exata de deploy/SQL depende da auditoria da inicialização.

Após autorizações e validação: habilitar apenas o par acima e testar com contato controlado na M1MTesteIA existente, sem trocar sessão ou alterar Evolution. Excluir somente histórico sintético dessa conversa, consultar sincronização e receber novo evento real. Origem sem prova vai para revisão sem IA; retomar somente selecionado/descarte preservando histórico excluído. ID desconhecido e data não são prova de novidade. Teste real e exclusão/envio não autorizados nesta etapa. Contatos/limpeza em massa fora da unidade.

## Próxima ação
Executar M1M_PROTECAO_RESTRITA_ISOLADA_R5.ps1 no PowerShell do PC da agência com Docker Desktop e enviar TXT único. Nenhum commit/push novo, merge, SQL compartilhado, ativação, deploy ou teste WhatsApp executado.

## Retomada em 2026-11-04 — resultado recebido antes da pausa

R5 PASSED no PostgreSQL 16.15 e autenticacao reais, eventos sinteticos, sem navegador/WhatsApp. Seis reinicios reais: pausa bloqueia previa/confirmacao, preserva sincronizacao/webhook contra reimportacao e revisao/retomada/descarte; configuracoes ausente/invalida/wildcard/instancia divergente nao ampliam alcance; B preservada e reativacao limitada aprovadas. Processos/container/armazenamento proprios encerrados/removidos, zero envios. Evidencia preservada em docs/evidence/protecao-restrita-r5-postgresql-real.txt; SHA256 07745fe16f58d0476821f61e14dc80bdb75a61360f7041c2006d8bc38067a84a. Vinte arquivos conferidos com manifesto e snapshot 1fb4ca00d69aa2e758da8636eafdcc2a3a8c27ea78fa1b568d11588f07aff5ca; nenhuma alteracao funcional posterior ao teste. HEAD local conferido baa42d405754d4a1e4b8c4818713aaaeeb0155e5; remoto e producao nao consultados nesta retomada. Nenhum teste repetido.

Unidade de validacao isolada R5 concluida; registro Git da R5 depende de autorizacao especifica de commit/push ainda nao concedida. Merge/SQL compartilhado/ativacao/deploy/teste WhatsApp nao realizados. Proxima acao: autorizacao do proprietario para registrar somente candidato R5 validado e respectivas evidencias, preservando auxiliares nao relacionados. Persistem auditoria futura do comando Coolify/migrations, autorizacoes separadas e ensaio WhatsApp delimitado antes de liberacao compartilhada.

## Registro R5 autorizado

Conferência direcionada: 20/20 arquivos idênticos ao manifesto testado e ao ZIP executado, snapshot 1fb4ca00d69aa2e758da8636eafdcc2a3a8c27ea78fa1b568d11588f07aff5ca. Três SQLs já versionados permanecem inalterados; registro inclui 17 arquivos de implementação/testes e cinco de executor/manifesto/documentação/evidência. Sem alteração funcional posterior; testes aprovados não repetidos. Fonte e relatório contêm somente eventos sintéticos, sem credenciais/dados de produção. Autoriza-se somente commit/push nesta branch; integração, SQL compartilhado, ativação e deploy continuam pendentes de autorização. Próxima etapa mínima: conferir com autorização somente leitura comando efetivo do Coolify e migrations aplicadas/pendentes antes de propor sequência de publicação. Não iniciada nesta rodada.
