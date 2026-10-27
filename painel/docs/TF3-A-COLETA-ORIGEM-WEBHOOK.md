# TF3-A — evidencia necessaria para distinguir mensagem nova de replay

## Resultado da revisao de 26/10/2026

Base remota: `tf3-a-reconstrucao-indicadores-20261026`, HEAD `45f1b30677ddcfc07505ff30ba5f2a0392bab268`.

Causa comprovada no codigo: a rota aceita `MESSAGES_UPSERT` ou evento ausente, repassa apenas `body.data` ao pipeline e este chama `syncIncomingMessage` com `countNewWebhookEvent: true` incondicionalmente. Portanto, a flag significa caminho de entrada, nao novidade comprovada. O ledger deduplica IDs conhecidos; nao distingue um ID historico desconhecido de um ID novo.

Nao foram encontrados fixtures de webhooks reais ou versao/imagem implantada da Evolution no repositorio. `messageTimestamp`, ID desconhecido, `notify`, `append` e ordem de chegada nao foram promovidos a prova de novidade. Nenhuma janela de tempo foi adicionada. A reativacao permanece bloqueada e a flag do ledger nao deve ser ativada.

## Evidencia indispensavel

1. Versao exata e digest/tag da imagem Evolution efetivamente implantada, provider e versao Baileys, se disponivel. Nao enviar segredos ou arquivo de ambiente completo.
2. Envelope recebido, antes de extrair `data`, de uma mensagem enviada agora na instancia de testes, com anotacao externa de que foi enviada agora.
3. Envelope de mensagem legitima atrasada: envio durante desconexao controlada da instancia de testes e entrega apos reconexao. Registrar horarios de envio, desconexao e reconexao como observacoes, sem usar esses horarios como regra de descarte.
4. Envelope de replay historico produzido pela origem, com ID comprovadamente ausente do ledger. Uma repeticao HTTP de um payload novo nao comprova como a origem sinaliza historico.
5. Reentrega do mesmo ID e eventos recebidos fora de ordem; preservar correlacao por tokens e anotar qual operacao controlada produziu cada caso.
6. Para reaparecimento: repetir os casos historico/novo em conversa oculta somente no ambiente de teste quando a migration e o teste funcional estiverem autorizados. Nao executar migration nesta etapa.

O dado decisivo e um marcador autenticado de origem com semantica comprovada na versao implantada, ou sequenciamento confiavel que sobreviva a reconexoes e permita separar historico. Se a origem enviar envelopes indistinguiveis, a solucao precisa ser preparada no emissor/reconciliacao; um filtro apenas no consumidor nao resolve essa ausencia de informacao.

## Coleta preparada, nao ativada

`collectWebhookEvidence` observa o envelope apos autenticacao e antes do filtro de eventos. Nao altera pipeline, contadores, mensagens ou atendimento.

Configuracoes necessarias para uma futura execucao autorizada:

- `M1M_TF3A_CAPTURE_WEBHOOK_EVIDENCE=true`.
- `M1M_TF3A_EVIDENCE_INSTANCE` igual a instancia exclusiva autorizada de testes, `M1MTesteIA`.
- `M1M_WEBHOOK_SECRET` existente e configurado; seu valor nunca deve ser enviado em relatorio.
- Manter `M1M_TF3A_UNREAD_LEDGER_ENABLED` desativado.

Sem flag, instancia-alvo e segredo, a coleta nao emite logs. Outras instancias sao ignoradas. Logs usam o prefixo exato `[TF3-A WEBHOOK EVIDENCE]` e classificacao `UNCLASSIFIED`.

Sao coletados tipos dos campos de envelope/data/key, marcadores permitidos, timestamp numerico e tokens HMAC para correlacao. Nao sao emitidos conteudo, nome, telefone, JID, ID bruto, URL de midia, credenciais ou o payload completo. Valores textuais desconhecidos sao descritos apenas pelo tipo; se aparecer `present:string` em um marcador decisivo, sera necessario um exemplo sanitizado desse campo e sua semantica na versao implantada. Eventos em lote sao identificados por quantidade; nao se presume semantica por item.

Esta instrumentacao esta preparada na branch, sem deploy. Sua coleta real depende de publicacao manual pelo proprietario ou de ambiente de teste ja autorizado. Nenhuma publicacao foi executada. Se a coleta ocorrer futuramente, desativar a flag apos os casos controlados e exportar apenas as linhas desse prefixo, anotando o cenario correspondente.

## Matriz de aceite pendente

- Historico com ID desconhecido: nao aumentar nao lidas, nao reabrir conversa oculta.
- Nova mensagem, inclusive atrasada: contabilizar uma vez e reabrir conversa oculta conforme regra WhatsApp.
- Repeticao/fora de ordem: preservar idempotencia e leituras ja confirmadas.
- Mesmo ID em outra empresa/instancia: isolamento integral.

Os oito cenarios comportamentais existentes continuam executaveis com persistencia simulada. Os testes novos da instrumentacao comprovam coleta restrita e ausencia de classificacao inventada; nao sao apresentados como aprovacao da matriz funcional acima. Nenhum teste com PostgreSQL real ou Evolution real foi executado.


## Evidencias reais e revisao da origem — 26/10/2026

- Tela Coolify: imagem configurada evoapicloud/evolution-api:v2.3.7; existiam alteracoes pendentes, portanto essa tela sozinha nao comprovava a imagem em execucao.
- Logs do processo confirmam Evolution v2.3.7 em execucao. Digest da imagem e correspondencia exata entre binario e fonte publica ainda nao comprovados.
- Recebido envelope de texto individual enviado sob controle do proprietario na M1MTesteIA: messages.upsert, fromMe=false, messageType=conversation, status=DELIVERY_ACK, source=android. Nenhum type/requestId ou marcador explicito de origem historica foi mostrado. Nao registrar credenciais ou identificadores pessoais neste documento.
- As varias linhas do mesmo texto nos logs nao comprovam reentregas HTTP distintas.

### Fonte publica inspecionada

Tag Evolution 2.3.7, commit cd800f2976e1e5b682fbf86a01ee4d85ae61f370:
https://github.com/EvolutionAPI/evolution-api/blob/cd800f2976e1e5b682fbf86a01ee4d85ae61f370/src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts

- Linha 1083: handler recebe messages, type e requestId.
- Linha 1166: aceita tanto notify como append.
- Linha 1204: prepara o objeto por prepareMessage(received).
- Linha 1483: emite MESSAGES_UPSERT com messageRaw, sem preservar type/requestId nesse objeto.
- Linha 4652: prepareMessage seleciona campos da mensagem e calcula source pelo dispositivo inferido do ID. source nao significa live/history.
- Linha 1049: caminho messaging-history.set emite MESSAGES_SET com isLatest/progress.

O package.json e o package-lock.json dessa tag fixam baileys 7.0.0-rc.9. Inspecionado o pacote npm correspondente (shasum fd1ad83e9bfef275b2d93627841bdb85d00993d8). Em lib/Socket/messages-recv.js:1073, mensagens com atributo offline usam append; as demais usam notify. Portanto append nao e prova suficiente de replay historico. O comportamento do pacote localmente inspecionado nao comprova a versao realmente embutida na imagem em execucao.

### Consequencias para a correcao

1. A perda de type/requestId no adaptador publico esta comprovada na fonte e e compativel com o envelope real; a identidade exata do binario implantado permanece por confirmar.
2. Nao usar filtro notify-only, append=history, timestamp ou ID desconhecido para resolver o ledger.
3. MESSAGES_SET deve continuar sem gerar novas nao lidas nem reabrir conversa. O filtro atual da rota ja ignora esse evento; isso nao resolve todos os possiveis replays em MESSAGES_UPSERT.
4. Preservar origem no emissor (handler/type/requestId) permitiria analise adicional, mas nao e, sozinho, garantia contra replay de um evento originalmente novo. Seriam necessarios identidade duravel do evento e politica de reconciliacao antes da ativacao.
5. Nao ha ate aqui envelope real de replay historico desconhecido nem de entrega offline controlada. A ocorrencia efetiva dessa falha em producao nao foi demonstrada; trata-se de uma lacuna de protecao identificada no codigo.
6. Logs existentes ja mostram o envelope: nao publicar instrumentacao apenas para reproduzir os mesmos campos ausentes. Nao alterar a Evolution compartilhada para obter metadados sem plano isolado e autorizacao especifica.

Nenhuma alteracao funcional, migration, merge, ativacao ou deploy foi executado nesta revisao. Validacao desta etapa: inspecao estatica de fontes versionadas e comparacao com o envelope real; nao foram executados novos testes de banco ou testes funcionais de replay. Os resultados anteriores de testes simulados nao sao promovidos a validacao da origem.
