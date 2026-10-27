# TF3-A — leitura confirmada separada de ocultacao

## Base e estado operacional confirmado

Branch tf3-a-reconstrucao-indicadores-20261026; base desta revisao: 8dbffb22fe115901f8335abce616bd1bc7342131. Bases do servico e teste locais comparadas integralmente com esse commit remoto antes da gravacao.

Proprietario executou a inclusao autorizada de MESSAGES_SET no webhook M1MTesteIA. Retorno: INCLUSAO_CONFIRMADA; antes MESSAGES_UPSERT; depois MESSAGES_UPSERT e MESSAGES_SET; otherConfigurationUnchanged=true. Backup informado pelo comando: /tmp/m1m-tf3a-webhook-backup.json, protegido, sem conteudo exportado para este documento. Utilitario de inspecao/restauracao no mesmo container: /tmp/m1m-tf3a-webhook.cjs. Arquivos /tmp sao temporarios; nao reiniciar/recriar container neste procedimento.

Busca posterior por messages.set nao encontrou ocorrencias nas 1.000 linhas carregadas no Coolify. Isso nao demonstra ausencia em todos os logs nem aprova teste historico. Nao foi provocado reconnect ou replay. Habilitacao do evento permanece separada da flag do ledger, que continua desativada.

## Causa comprovada no servico

hideConversationState marcava todas as mensagens pendentes com readAt=agora. recordIncomingUnreadEvent tambem fazia isso com cada mensagem recebida enquanto o estado estivesse oculto. Nenhum dos dois caminhos recebe confirmacao READ/PLAYED. Assim, ocultacao estava sendo registrada como leitura confirmada, contrariando o contrato do ledger.

## Correcao

- Ocultar nao atualiza readAt nem apaga registros do ledger. Mantem tombstone e unreadCount=0 para exclusao do indicador visivel.
- Entrada enquanto oculta permanece no ledger sem recibo fabricado; conversa continua oculta e sem incremento no indicador.
- recordConfirmedRead continua aplicando somente IDs comprovados pelo caller; preserva unreadCount=0 enquanto a conversa estiver oculta, mesmo havendo mensagens pendentes no ledger.
- Mensagens efetivamente lidas conservam seus recibos. O numero remaining retornado pelo servico indica pendencias no ledger, nao conversas visiveis.
- Nenhum schema ou migration alterado. Nao existe dado real de producao a corrigir nesta etapa, pois o novo ledger nao foi ativado por esta conversa.

## Validacoes

Reproduzida a falha na versao anterior executando o servico original com o teste reforcado: readAt deixou de ser null apos ocultacao. Servico corrigido aprovado nos oito cenarios originais e em dois adicionais: leitura parcial em conversa oculta sem falsa leitura do restante; confirmacao explicita da mensagem recebida enquanto oculta.

Teste estrutural aprovado, TypeScript sem erros, ESLint do servico sem ocorrencias e diff sem erros de whitespace. Persistencia simulada nos dez cenarios; nao comprovam PostgreSQL, isolamento SERIALIZABLE real, rollback ou concorrencia real. Nenhuma migration, merge, deploy, restart ou nova configuracao foi executada pelo assistente nesta revisao.

## Limites preservados

Reabertura segura continua pendente e bloqueada. A supressao visual nao define ainda quais mensagens deveriam voltar ao reabrir; isso depende de reconciliacao e evidencia de novidade. Replay de ID historico desconhecido e JID/LID continuam pendentes. Oito cenarios de comportamento anteriores foram preservados, mas nao sao prova de funcionamento integral do contador ou do WhatsApp.
