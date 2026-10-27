# TF3-A — leitura entre persistencia do historico e entrada no ledger

Base remota confirmada: 53ac5e70aa1631fed510e1bd947b3aa592921bb7, branch tf3-a-reconstrucao-indicadores-20261026.

## Falha reproduzida

syncIncomingMessage persiste M1MMessage antes de chamar recordIncomingUnreadEvent. Nesse intervalo, a rota pode confirmar READ/PLAYED, mas persistLedgerRead retornava sem acao se ainda nao houvesse estado do ledger. Mesmo com estado existente, recordConfirmedRead atualizava apenas entradas ja registradas e perdia recibos de IDs ainda ausentes. O evento posterior podia entao aumentar nao lidas apesar da confirmacao anterior.

O teste novo, executado com a fonte 53ac5e70, reproduziu descarte do recibo antes do primeiro ledger. Trata-se de reproducao com persistencia simulada, nao demonstracao em PostgreSQL/WhatsApp real.

## Correcao

- A rota continua verificando identidade, tenant, instancia, permissoes e recibos na Evolution antes de chamar persistLedgerRead.
- Para IDs ja confirmados, a rota pode obter a identidade canonica do cliente no historico local da mesma empresa/instancia e JID comprovado. Unifica essa evidencia com estados do ledger. Mais de uma identidade canonica continua bloqueada.
- O servico consulta historico local apenas de mensagens de entrada, nao enviadas, da mesma empresa/instancia e cliente canonico.
- Quando ha historico comprovado, cria estado ausente e entradas do ledger ja lidas dentro da transacao SERIALIZABLE. Usa sentAt persistido, sem inventar data de recebimento ou aplicar janela temporal.
- createMany com skipDuplicates impede duplicar entradas existentes. Se o recebimento chegar depois, encontra o ID ja registrado e nao incrementa nao lidas. Leitura e nova entrada continuam com retry P2034.
- IDs sem historico correspondente nao geram entradas antecipadas. Mensagens de outra empresa/instancia/conversa ou enviadas pelo proprio numero nao servem para criar recibos.
- Ocultacao continua sem fabricar readAt; leitura de conversa oculta mantem contador visivel zerado.

## Validacoes

Doze cenarios comportamentais do servico aprovados, preservando os oito originais. Dois novos verificam recibo antes do primeiro ledger, entrega posterior idempotente, data original preservada, outra mensagem atrasada contabilizada e filtros de empresa/instancia/conversa/direcao.

Quatro cenarios da rota aprovados com dependencias simuladas: historico anterior ao ledger; identidades divergentes bloqueadas; flag desligada; ausencia de identidade persistida. Teste estrutural aprovado. TypeScript e ESLint dos arquivos TS alterados aprovados. Novo teste da rota incluido no workflow; execucao remota nao comprovada.

Nenhum schema/migration alterado. Nenhuma conexao a banco real, webhook real, migration, merge, restart ou deploy foi executado nesta revisao. Testes simulados nao comprovam isolamento/concorrencia/rollback de PostgreSQL.

## Limites restantes

Se o recibo chega antes de existir qualquer historico local e qualquer identidade persistida, este caminho nao cria identidade por suposicao e a reconciliacao desse caso continua pendente. O replay de ID historico desconhecido e a reabertura segura continuam pendentes. Mudancas JID/LID concorrentes ainda exigem integracao. Nao habilitar o ledger com base apenas nestes testes.
