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
