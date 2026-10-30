# Recuperação durável de recebimento concorrente — R3 local

Branch conferida: feat-exclusoes-operacionais-20261030. HEAD local/remoto conferidos antes das alterações: 33a6c41e1acd3ad0d964c9b3741cc22930a2b653. Main última conferida: 40ebcebb3cbfe7bcf3947e6ccceda991c163b806. Produção não consultada ou alterada. Working tree inicial sem alterações rastreadas; auxiliares/documentos anteriores não rastreados preservados. Nenhum novo commit/push autorizado ou realizado.

## Implementação

- Repositório: ingestConcurrent faz transação independente da trava ocupada, grava review com CONCURRENT_RECEIPT/deletionId nulo, deduplica pela chave já existente e só resolve após commit. Payload em whitelist, sem envelope/apikey/headers. Decisão/payload anteriores não são sobrescritos por repetição.
- Pipeline: captura somente CONVERSATION_BUSY; aguarda custódia durável antes do resultado recebido pelo webhook. Falha de gravação propaga erro, sem ACK falso. Dry-run continua sem gravação. Outros erros não viram sucesso.
- Serviço: reutiliza normalização segura e intercepta reviews existentes mesmo sem exclusão confirmada, evitando que repetição siga para IA. Ao retomar, revalida manifesto para impedir importação de histórico excluído. Mensagem já persistida do mesmo cliente é reconhecida sem duplicar mensagem/atendimento/auditoria. Importador manual continua fora do pipeline automático. Identidade não resolvida exige associação administrativa; atendimento HUMANO bloqueia importação nova.
- UI/API: mostra “Recebimento concorrente — origem incerta”, sem declarar novidade; mantém revisão, retomada seletiva e descarte. Erro explícito para histórico excluído. Não altera filas, indicadores ou Evolution.

## SQL exato autorizado e executado localmente

SQL original 84a4c724d0f7ef80f7b6fb82072c67657accce93f26337eb87eb0863a12ac0c8.
Ampliação dos dois CHECKs a93790c9c4481a1c1b3eb52f303c7e4c1e830baa3a745f046c647866cd7b476e.
Rollback 0b1c012b8cef7ef2b5b796b4d2db7ab73ee4fbdd9deccd0f93423f5f714fc385.

Hashes registrados antes da primeira execução. Somente dois CHECKs da revisão ampliados, sem tabela/coluna/índice/enum novo, sem backfill. Testes locais executaram esses arquivos exatos apenas em banco novo PGlite/WASM; não PostgreSQL servidor. O comentário “proposta/não executada” nos arquivos é o cabeçalho original preservado para manter o SQL autorizado e seu hash; este documento registra a execução isolada posterior. Nenhum SQL em banco existente/compartilhado ou produção.

## Validação local concluída

Nove verificações do novo repositório/SQL passaram em PGlite/WASM: dois CHECKs e demais constraints; rollback permitido sem registros e bloqueado com novo motivo; whitelist/deduplicação; rejeição de motivo/vínculo inválido; escopo empresa/instância; retomada seletiva sem exclusão confirmada; repetição após descarte/retomada; bloqueio de histórico já excluído. Engine descartado/encerrado. Treze regressões do repositório existente passaram no banco embarcado após a alteração do método de decisão. TypeScript e ESLint focado passaram; sintaxe JS do executor e integridade do pacote conferidas. Não repetida tentativa Prisma/socket embarcado que já falhara antes; não apresentada como API real.

## Validação real preparada, ainda pendente

Pacote M1M_RECEBIMENTO_DURAVEL_ISOLADO_R3.ps1 usa base fixa do commit publicado e overlay de dez arquivos com manifesto. Não altera projeto/.env originais: cópia temporária, npm ci --ignore-scripts, dois bancos novos em container próprio PostgreSQL 16 restrito a loopback, login/JWT reais, provedor WhatsApp fake local, ledger false. Sem navegador nesta rodada.

Revalida o repositório alterado no primeiro banco; no segundo aplica SQL original e ampliação autorizada, verifica CHECKs e rollback sem registros, depois testa pelas APIs: recebimento durante exclusão bloqueada e revisão já visível em conexão independente antes de liberar a exclusão; reinício real do processo Next com mesmo banco e recuperação da revisão sem reenviar webhook; repetição sem duplicação; retomada somente de selecionado; descarte; manifesto antigo; revisão/recebimento simultâneos; mesmo ID em empresa e instância diferentes; grupo; bloqueio HUMANO; falha real de persistência com lock em tabela existente (sem trigger ou novo schema), exigindo 500 e nenhum registro parcial; rollback bloqueado quando há registros do novo motivo; evento já salvo sem novo atendimento; ausência de envios/IA/atendimento automático e de histórico restaurado. Esta é preparação, não resultado aprovado.

O executor encerra/reinicia apenas seus processos e remove apenas seu container/cópia temporários. Registra um TXT único diretamente na Área de Trabalho, sem pasta/logs separados/abertura automática. Dependência: PC da agência, Docker Desktop, Node/Git/npm; sem Coolify ou Evolution. O relatório distinguirá PostgreSQL real do embarcado e reinício real de simples recriação de objeto.

## Limitações e rollback

A correção não garante ACK quando o próprio banco falha: nesse caso retorna erro. Não afirma retry automático real da Evolution. Dados e eventos de teste são sintéticos. Referências de mídia podem expirar. Rollback não pode remover pendências: recusa se houver qualquer CONCURRENT_RECEIPT, mesmo decidido; não se apagam registros para permitir reversão. Manter leitor compatível e recuperação durável depois de começar a usar esse motivo. ALTER CHECK usa locks e timeouts definidos; nenhum uso compartilhado autorizado.

Commit/push novos: não realizados. Merge, SQL compartilhado, ativação e deploy: não realizados. Contatos/limpeza em massa fora do escopo. Próxima ação: proprietário executar pacote isolado R3 e devolver o TXT; somente após evidência real pode-se decidir pelo registro da correção como nova candidata.

Snapshot R3: c0ec163e7095286f60dab81bd28cf41da2f53db04c177231edbd721bf2e17c82

Arquivos alterados da aplicação/teste:
- docs/proposals/exclusoes-conversas.sql
- docs/proposals/recebimento-concorrente-revisao-proposta.sql
- docs/proposals/recebimento-concorrente-revisao-rollback.sql
- painel/src/app/api/conversation-deletions/route.ts
- painel/src/components/config/ConversationDeletionReview.tsx
- painel/src/services/conversation-deletion.repository.ts
- painel/src/services/conversation-deletion.service.ts
- painel/src/services/incoming-message-pipeline.service.ts
- painel/tests/regression/concurrent-receipt-durable-database.mjs
- painel/tests/regression/conversation-deletion-integration.mjs


## Retorno R3 e executor R3.1

TXT do proprietário preservado em docs/evidence/recebimento-duravel-r3-bloqueio-createdb.txt. Falha no createdb do segundo banco, antes de gerar Prisma ou executar SQL/testes da aplicação. Não contém stderr do comando; causa específica ainda inconclusiva. Container/armazenamento removidos conforme relatório. Executor R3.1 exige pg_isready por TCP 127.0.0.1 em vez de somente socket local, usa banco de manutenção explicitamente e preserva eventual erro nativo do createdb no mesmo TXT. Isso corrige uma fragilidade de prontidão, sem declarar comprovada a causa da falha anterior. Código funcional/SQL/snapshot idênticos à R3 (c0ec163e7095286f60dab81bd28cf41da2f53db04c177231edbd721bf2e17c82). Manifesto e dez arquivos verificados; PowerShell Windows não executado localmente. Nenhum teste aprovado repetido e nenhum novo SQL executado nesta revisão do executor. Próxima ação: executar M1M_RECEBIMENTO_DURAVEL_ISOLADO_R3_1.ps1 no PC da agência e devolver TXT único da Área de Trabalho. Sem commit/push/merge/ativação/deploy.

## Resultado real R3.1 recebido — 2026-10-30

Relatório do proprietário preservado em `docs/evidence/recebimento-duravel-r3-1-postgresql-real.txt`. Ambos os blocos PASSED: 14 verificações do repositório em PostgreSQL 16.15 real e 19 verificações da integração durável com autenticação real, eventos sintéticos e provedor fake em loopback. Segundo banco criado; SQL original/extensão/rollback com os SHA-256 previamente registrados. Snapshot funcional idêntico à R3.

HTTP 200 somente após revisão persistida e visível em conexão PostgreSQL independente, com exclusão ainda bloqueada. Reinício real do Next (PID 32296 → 24176), recuperação pela API sem reentrega externa. Repetição, retomada seletiva, descarte, manifesto histórico, concorrência, empresa/instância, grupo e bloqueio HUMANO aprovados. Falha forçada de gravação retornou HTTP 500, sem ACK falso nem registro parcial. Ausência de IA/atendimento automático e zero envios sintéticos. Rollback aprovado sem registros novos e bloqueado com CONCURRENT_RECEIPT, inclusive decidido, preservando dados.

Sem navegador nesta rodada: evidências anteriores R2.6/R2.7 reutilizadas; apresentação do novo motivo não foi validada em navegador real nesta rodada. Não comprova integração WhatsApp, retry automático da Evolution ou produção. Processos encerrados e container/armazenamento temporários removidos conforme relatório.

HEAD local conferido: 33a6c41e1acd3ad0d964c9b3741cc22930a2b653, branch feat-exclusoes-operacionais-20261030. Código da recuperação e esta evidência continuam locais, sem novo commit/push. Remoto e produção não consultados nesta conferência. Merge, SQL compartilhado, ativação e deploy não executados. Próxima ação: autorização específica para commit/push desta correção validada; não implica prontidão ou autorização para ambiente compartilhado.

SHA-256 do TXT recebido: ad48290f8df68958da48c37f32fc39c90de4aa76ab0fbb5b186fa435f301030c

## Conferência para registro autorizado

Manifesto R3.1: dez arquivos conferidos byte a byte pelos SHA-256, snapshot c0ec163e7095286f60dab81bd28cf41da2f53db04c177231edbd721bf2e17c82. Nenhuma alteração funcional posterior ao teste. SQL original já versionado permanece inalterado; somente os dois CHECKs propostos e rollback acompanham este registro. Relatório contém exclusivamente ambiente sintético. Evidências anteriores do navegador são R2.6 (fluxo principal) e R2.7 (admin global), preservadas no commit-base 33a6c41; não validam a interface R3.1. Próxima unidade mínima: validar em navegador isolado o novo motivo de recebimento concorrente, confirmação/cancelamento, retomada/descarte e erro de histórico conhecido; reutilizar os demais fluxos anteriores ainda aplicáveis. Sem necessidade de Evolution ou clientes reais.
