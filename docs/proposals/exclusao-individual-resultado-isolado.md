# Exclusão individual com revisão — CANDIDATA R2.8

Conferência em 30/10/2026 (Cuiabá).

**CANDIDATA. NÃO PRONTA PARA AMBIENTE COMPARTILHADO.** Pendência aberta: recebimento concorrente pode retornar HTTP 500 antes de persistir o evento e depender de reentrega externa ainda não comprovada. Os testes sintéticos não eliminam esse risco. Commit/push autorizados pelo proprietário somente para registrar a candidata; merge, SQL compartilhado, ativação e deploy não autorizados.

Branch: feat-exclusoes-operacionais-20261030.
HEAD local: 00f91f32af0766ae9e89c4ff8dcde5302cf4f417.
Main consultada no GitHub: 40ebcebb3cbfe7bcf3947e6ccceda991c163b806.
Árvore base idêntica: f700d40edf1845a0e4c0e9e983984054a3fd1ca2.
Working tree contém esta implementação sem commit e auxiliares anteriores preservados. A produção não foi consultada ou alterada nesta etapa; main não comprova imagem implantada.

## Entrega

Prévia/cancelamento e exclusão individual transacional, nova capacidade explícita DELETE_CONVERSATIONS, bloqueio HUMANO ativo (mesmo sem responsável), manifesto de IDs apagados, captura de eventos incertos fora das filas/IA, revisão administrativa local/global, retomada somente do evento escolhido e descarte persistente contra repetição. Não recupera histórico excluído. Contato, agenda, atendimento e financeiro são preservados.

Nova mensagem persistida depois da prévia bloqueia a confirmação e exige nova prévia. Mudança de conteúdo/updatedAt também bloqueia. Marcadores, importadores, pipeline e envios usam coordenação por empresa/instância/identidade. Recurso desligado por padrão; ledger permanece desligado.

## Critérios e limites

- ID do manifesto: histórico conhecido, não reimportar.
- ID desconhecido/fromMe/data/transporte: não comprovam novidade; revisão sem automação.
- Novidade aceita no caminho de envio autenticado: ID confirmado pelo provedor e recibo persistido correlacionado ao usuário/operação. Testado com provedor fake.
- Retomada manual: ADMIN_ACCEPTED_UNCERTAIN; não prova novidade e não executa IA.
- LID sem identidade comprovada: revisão separada; associação manual exige destino identificado já excluído da mesma empresa/instância.
- Referência de mídia expirada pode não ser recuperável; não há promessa de arquivo futuro.
- Até 5.000 mensagens por prévia nesta unidade; excesso falha explicitamente, sem exclusão parcial/silenciosa. Revisão paginada em 100.
- Exclusão é local ao M1M Connect; não apaga mensagens no WhatsApp. Permissão DELETE_MESSAGES não concede exclusão de conversa.

## Evidências reais

| Rodada | Resultado comprovado |
|---|---|
| R2.2 | 14 verificações em PostgreSQL 16.15 servidor real: persistência, idempotência, vínculos/FK, isolamento, revisão/descarte, rollback e duas sessões concorrentes no repositório. |
| R2.6 | Login/JWT e permissões reais; origem externa rejeitada; interface real de prévia/cancelamento, conflito, exclusão/seleção/F5, revisão/retomada/descarte/F5/mobile; grupos e preservação de vínculos; eventos sintéticos sem IA/encaminhamento automático. O último teste global falhou e foi separado, não ocultado. |
| R2.7 | PASSED: navegador global, empresa selecionada, revisão e retorno ao gerenciamento sem cookie de cliente. |
| R2.8 | PASSED: concorrência pelas rotas HTTP com login e PostgreSQL reais; recebimento bloqueado durante exclusão, reentrega sintética capturada em revisão; duas decisões concorrentes, uma 200 e outra 409, importação única/decisão persistida. Sem repetir navegador. |

TypeScript, lint dos novos serviços/componentes e regressões existentes já registrados nas verificações anteriores. Não repetidos sem mudança funcional. A R2.8 alterou apenas testes/executor: os arquivos funcionais têm os mesmos hashes da R2.6/R2.7.

R2.8 registrou HTTP 500 para recebimento em disputa e sucesso na reentrega sintética explicitamente disparada pelo teste. Isso NÃO comprova que a Evolution real repetirá automaticamente todo evento recusado. Essa condição precisa ser verificada antes de ativação compartilhada; não alterar Evolution sem autorização. Não houve integração WhatsApp real, teste de carga ou limpeza de clientes. Os recursos temporários foram encerrados/removidos conforme os relatórios.

## SQL

Arquivo: docs/proposals/exclusoes-conversas.sql.
SHA256: 84a4c724d0f7ef80f7b6fb82072c67657accce93f26337eb87eb0863a12ac0c8.
Três tabelas novas (operação, manifesto de IDs, revisão) e duas extensões de enum. Prisma mapeia exatamente essas estruturas. SQL aplicado somente nos bancos novos/descartáveis de teste; não está em prisma/migrations nem roda no início da aplicação. Sem backfill, concessão automática, limpeza de dados ou alteração de registros de clientes existentes.

Impactos para implantação futura: crescimento dos marcadores por ID/evento, até quatro conexões adicionais quando habilitado, travas por conversa. Autorização de SQL em banco compartilhado continua necessária. Desativar a flag após exclusões reais não é rollback seguro por si só: os marcadores devem continuar respeitados para não reimportar histórico. Restaurar conteúdo apagado exigiria backup autorizado. Não remover marcadores/tabelas de operação como rollback após uso. Enums podem permanecer sem uso; tabelas vazias só podem ser removidas após revisão específica.

## Situação e próxima ação

Commit: não realizado. Push: não realizado. Merge: não autorizado/não realizado. Deploy: não realizado e exclusivamente manual pelo proprietário. SQL compartilhado/produção: não executado/não autorizado.

Próxima ação após registro autorizado do candidato: investigar e resolver persistência/recuperação durável do evento concorrente, sem depender de retry externo não comprovado. Preservar o código funcional e as evidências da candidata R2.8. Não inclui merge, SQL compartilhado, ativação ou deploy. Após publicação da branch, revisar aplicação do schema e condição de reentrega real antes de qualquer ativação. Exclusão de contatos e limpeza em massa permanecem fora desta unidade.

## Arquivos do candidato (34)

- docs/proposals/exclusoes-conversas.sql
- painel/prisma/schema.prisma
- painel/src/app/api/attendance/finish/route.ts
- painel/src/app/api/attendance/transfer/route.ts
- painel/src/app/api/chat/list/route.ts
- painel/src/app/api/chat/media/route.ts
- painel/src/app/api/chat/read/route.ts
- painel/src/app/api/chat/send-media/route.ts
- painel/src/app/api/chat/send/route.ts
- painel/src/app/api/conversation-deletions/route.ts
- painel/src/app/api/customer-center/media/route.ts
- painel/src/app/api/customers/assign/route.ts
- painel/src/app/configuracoes/page.tsx
- painel/src/app/configuracoes/revisao-conversas/page.tsx
- painel/src/app/m1m-admin/companies/[companyId]/manage/page.tsx
- painel/src/app/m1m-admin/companies/[companyId]/manage/revisao-conversas/page.tsx
- painel/src/components/chat/ChatConversationHeader.tsx
- painel/src/components/chat/ChatConversationSidebar.tsx
- painel/src/components/chat/ChatInbox.tsx
- painel/src/components/chat/DeleteConversationAction.tsx
- painel/src/components/config/ConversationDeletionReview.tsx
- painel/src/components/config/UsersSettings.tsx
- painel/src/components/users/UserPermissionsEditor.tsx
- painel/src/services/auth/authorization.service.ts
- painel/src/services/conversation-deletion-route-guard.ts
- painel/src/services/conversation-deletion.repository.ts
- painel/src/services/conversation-deletion.service.ts
- painel/src/services/conversation-sync.service.ts
- painel/src/services/incoming-message-pipeline.service.ts
- painel/src/services/timeline.service.ts
- painel/src/services/user.service.ts
- painel/tests/fixtures/conversation-deletion-baseline.sql
- painel/tests/regression/conversation-deletion-database.mjs
- painel/tests/regression/conversation-deletion-integration.mjs

Snapshot do pacote R2.8: 619aeaf191fa45800201070e2dc02f6bba0f00651359642ba5cdabbf106128a4.
Diff revisável: docs/proposals/exclusao-individual-candidato.patch.
SHA256 do diff: abfdd7426278ac4b94619e478f521c05b59d042c7aeea0dc661b543167bc49a3
