# TF3-A — reconstrução integral dos indicadores (em desenvolvimento)

## Limites e segurança

- Branch isolada, sem merge, deploy ou execução de migração.
- Não executar testes em Casa do Criador ou Bee Pipocas. Testes funcionais somente em Marketing1Minuto.
- A migração é aditiva, sem backfill automático; o valor inicial 0 **não significa leitura confirmada**.
- NÃO conectar a nova tabela aos badges antes de implementar e testar reconciliação, identidade JID/LID e confirmação de leitura.
- A rota atual /api/chat/delete apaga mensagens individuais; preservar seu contrato.

## Contrato de arquitetura a implementar

1. Resolver identidade canônica por empresa + instância, com associação JID/LID comprovada na origem.
2. Processar mensagens de entrada de forma idempotente após persistência de M1MMessage. Evitar contagem dupla em reentregas.
3. Atribuir a contagem individual somente a mensagens recebidas não lidas, com marco de leitura verificável; não inferir leitura pelo timestamp da listagem.
4. Confirmar leitura na Evolution e reconciliar o estado local; não zerar indicadores em falhas ou respostas não confirmadas.
5. Calcular o badge lateral por COUNT de conversas visíveis com unreadCount > 0, independente da paginação e respeitando autorização de setores.
6. Calcular Aguardando e Em atendimento pelos atendimentos HUMANO e responsibleId, sem depender de unreadCount.
7. Ocultar conversas por tombstone persistente; reativar somente com evento de nova mensagem recebida comprovadamente posterior ao marco de exclusão.
8. Não permitir eventos atrasados ou respostas de polling sobrescreverem revisões mais recentes.
9. Preservar contatos, CRM, financeiro, mensagens e eventos de atendimento.

## Critérios mínimos de teste

- 0/1/4 conversas não lidas -> badge 0/1/4; 3 mensagens numa conversa -> badge 1 e individual 3.
- Leitura confirmada reduz individual e agregado; leitura não confirmada não finge sucesso.
- F5, reconexão, polling, paginação e JID/LID não ressuscitam contagens.
- Exclusão persiste em F5 e polling; webhook antigo não reativa; mensagem realmente nova reativa.
- Aguardando 1->0 oculta alerta; novo atendimento aguardando reexibe.
- Isolamento multiempresa, permissões por setor, mensagens duplicadas, concorrência e eventos fora de ordem.

## Status

Schema Prisma, migration aditiva, servico persistente e endpoints de leitura, contagem e ocultacao implementados parcialmente. Pipeline integrado de forma opt-in pela flag M1M_TF3A_UNREAD_LEDGER_ENABLED. Interface, reconciliacao inicial e reativacao segura continuam pendentes. Nao aplicar esta migration em producao isoladamente.

## Etapa de leitura confirmada (2026-10-26)

- Implementada `recordConfirmedRead`: aceita somente IDs ja verificados pelo caller, atualiza o ledger e recalcula a contagem em transacao serializavel com retry de conflito P2034.
- Rota `/api/chat/read` integrada a `recordConfirmedRead`, inclusive confirmacoes parciais. Validacao funcional com Evolution continua pendente.
- Reativacao de conversa oculta foi temporariamente bloqueada: timestamp isolado nao prova que a mensagem foi recebida apos a exclusao. Exige sequenciamento confiavel e teste de eventos atrasados.
- Pipeline chama o servico por `syncIncomingMessage` com `countNewWebhookEvent: true`, condicionado a flag. Telas e contador lateral ainda nao integrados.
- **Bloqueio para deploy:** nao publicar esta branch antes de concluir integracao, reconciliacao, testes e revisao de concorrencia. O novo ledger nao tem backfill validado.


## Validacoes isoladas em 26/10/2026

- Corrigido parametro `options` declarado no metodo errado: movido de `hasExistingCustomerForMessage` para `syncIncomingMessage` (commit d200d12f).
- `prisma validate` aprovado e cliente Prisma 7.9.0 gerado; nenhuma migration executada.
- `tsc --noEmit` aprovado apos geracao do cliente e correcao da assinatura.
- Oito arquivos de regressao existentes aprovados; teste estrutural do ledger incluido.
- Comparacao ESLint de ChatInbox com main sem novas ocorrencias (5 erros e 3 avisos em ambas). Isso nao representa lint integral aprovado.
- Build compilou e concluiu verificacao de tipos, mas falhou na coleta de paginas por DATABASE_URL ausente no ambiente isolado. Build completo nao aprovado.
- Novo teste `tf3a-unread-ledger-behavior.mjs`: oito cenarios aprovados executando o servico real com persistencia simulada. Cobre duplicidade, contagem por conversa, isolamento por empresa/instancia, IDs de outra conversa, leitura parcial/idempotente, replay de ID conhecido, ocultacao, retry P2034 e entradas invalidas.
- O teste de retry injeta conflitos antes da transacao: nao comprova concorrencia real, rollback ou integridade de PostgreSQL.
- Testes do ledger e validacao do schema incluidos no workflow TF3-A. Execucao remota desse workflow ainda nao comprovada.

## Pendencias comprovadas nesta revisao

- Webhook aceita MESSAGES_UPSERT (e evento ausente) e o pipeline marca `countNewWebhookEvent: true`; essa marcacao sozinha nao distingue replay historico ainda ausente do ledger de mensagem realmente nova.
- Replay de ID ja registrado foi testado; replay de ID historico desconhecido continua sem protecao comprovada.
- Conversas ocultas permanecem ocultas mesmo com nova mensagem: comportamento conservador temporario, nao implementacao concluida do reaparecimento.
- Faltam reconciliacao inicial/backfill validado, recibos externos de leitura, JID/LID, permissoes por setor, concorrencia em banco e integracao visual.
