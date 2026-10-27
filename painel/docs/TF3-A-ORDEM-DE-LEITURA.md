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


## Duplicatas com status divergentes

A revisao seguinte reproduziu outra falha na rota: READ seguido de DELIVERY_ACK para o mesmo ID/identidade resultava em pendencia e tentativa desnecessaria de marcacao de leitura. A escolha anterior preferia a ultima ocorrencia da identidade solicitada e ignorava o recibo confirmado da ocorrencia anterior.

Correcao: depois de validar que as ocorrencias pertencem a mesma identidade ou a par JID/LID espelhado comprovado, preservar qualquer READ/PLAYED contra duplicata sem recibo. Empates continuam preferindo identidade solicitada. Isso nao cria recibo, nao relaxa identidade/permissao e nao muda a classificacao de evento novo/historico.

Onze cenarios da rota aprovados com dependencias simuladas: os quatro anteriores, quatro ordens READ/PLAYED versus DELIVERY_ACK, conflito de identidade mesmo com READ e dois pares JID/LID espelhados com estados divergentes. Mantidos doze cenarios do servico e teste estrutural aprovados. TypeScript, ESLint da rota e diff-check aprovados. Nenhum teste de banco real, rede Evolution, migration, merge ou deploy executado nesta revisao.


## Recibo anterior a qualquer historico local

Reproducao adicional: a fonte 3d51a138, com o novo teste do servico, descarta o recibo quando ainda nao ha historico/ledger, mesmo havendo evidencia de data na origem. A revisao adiciona confirmedMessages opcional ao contrato interno do servico (IDs e datas da origem). Nao recebe esses metadados diretamente do navegador.

A rota extrai a data somente de messageTimestamp das mensagens verificadas na Evolution, apos confirmacao READ/PLAYED; aceita segundos Unix inteiros numericos ou string decimal com data representavel, sem janela de idade. Sem identidade local, somente uma identidade oficial/grupo comprovada para todos os IDs confirmados permite criar o estado. Apenas LID sem vinculo oficial nao cria estado novo por suposicao. Existindo identidade local comprovada, ela continua guiando a reconciliacao.

O servico valida IDs, datas e duplicidade da evidencia. Usa primeiro datas locais ja persistidas. Para IDs ausentes daquele historico, consulta colisao na mesma empresa/instancia: um registro de outra conversa/direcao bloqueia criacao alternativa. Sem colisao, persiste o recibo com a data da origem na transacao SERIALIZABLE. Um evento posterior com o mesmo ID encontra entrada ja lida e nao incrementa o contador. Isso nao classifica eventos desconhecidos como novos nem implementa replay/reabertura.

Validacoes desta revisao: quatorze cenarios do servico e dezesseis da rota aprovados com persistencia/dependencias simuladas; preservados os oito originais. Incluidos data numerica/string, mensagem antiga legitima, repeticao, chegada posterior, evidencia invalida e conflito com historico. Reproduzida a falha com a fonte anterior. Teste estrutural, TypeScript, ESLint dos TS alterados e diff-check aprovados. Nao executados PostgreSQL, migrations, merge, restart ou deploy.

O limite anterior de ausencia de historico foi reduzido, nao eliminado universalmente: sem data valida ou identidade canonica comprovada, o recibo da Evolution pode ser confirmado pela rota, mas a reconciliacao antecipada do ledger continua pendente. Ainda e necessario tratar esse estado antes de ativar o contador. Os testes nao comprovam integracao JID/LID real, concorrencia real ou comportamento funcional em producao. Ledger permanece desligado.
