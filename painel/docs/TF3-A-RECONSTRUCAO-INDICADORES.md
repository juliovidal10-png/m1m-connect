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

Schema Prisma e SQL de migração preparados. Integração dos eventos, serviço de estado, APIs, interface e testes ainda NÃO implementados. Não aplicar esta migração em produção isoladamente.
