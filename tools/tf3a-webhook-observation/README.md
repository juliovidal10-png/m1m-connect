# TF3-A — proposta minima de observacao na instancia existente

Preparado, nao aplicado. Nao requer outro numero, Evolution, Redis ou migration.

## Estado confirmado pelo proprietario

Evolution em execucao: 2.3.7; Baileys declarado: 7.0.0-rc.9. Consulta GET retornou cinco instancias, M1MTesteIA presente, quatro outras instancias e duas outras conectadas. Isso comprova processo multi-instancia; nao identifica quais delas sao empresas clientes. Webhook M1MTesteIA enabled=true e somente MESSAGES_UPSERT.

## Alteracao proposta

Unico endpoint de escrita: POST /webhook/set/M1MTesteIA.

Corpo preparado: webhook.enabled=true, webhook.url mantida identica a URL atual revisada, webhook.events=[MESSAGES_UPSERT,MESSAGES_SET]. Nao enviar headers, base64 ou byEvents: o controlador 2.3.7 atualiza esses campos com undefined quando omitidos, preservando valores existentes via Prisma. A leitura posterior confere inclusive esses campos e a identidade do webhook.

A API exige url alem de enabled no schema: a ferramenta inclui a URL ja lida, nunca URL nova. Nao reenviar o objeto bruto retornado pelo GET, que inclui campos internos nao pertencentes ao DTO.

Nao existe alteracao global, troca de destino, instancia adicional, reinicio, deploy ou desconexao. O processo compartilhado continua servindo as outras instancias. O novo evento pode aumentar trafego/logs e carregar lotes historicos; nao e correto prometer impacto zero. A rota M1M revisada na main ignora MESSAGES_SET antes do pipeline; a versao efetivamente publicada do M1M ainda precisa ser confirmada antes da ativacao. Habilitar um evento nao inicia sincronizacao nem prova replay.

## Ferramentas preparadas

- plan.mjs: valida estado revisado e prepara alteracao/restauracao, sem rede.
- manage.mjs: roda no container Evolution com plan como modo padrao de leitura. apply e restore exigem liberacao explicita por variavel de ambiente para aquela execucao. Nao foi instalado nem executado no container do proprietario.
- plan.test.mjs: quatro testes com dados sinteticos, sem banco ou API.

O modo apply grava backup /tmp/m1m-tf3a-webhook-backup.json com permissao 0600 e recusa sobrescreve-lo. O backup contem configuracao/headers e nao deve ser enviado ao chat. Esse caminho e temporario: perde-se em recriacao do container; preservar copia protegida antes de qualquer reinicio/recriacao, que nao faz parte deste procedimento. A ferramenta nao remove backup automaticamente.

Antes do POST, repete GET e recusa estado alterado. Depois do POST, repete GET e compara eventos, URL, enabled, headers, flags e identidade. Existe uma pequena janela de concorrencia entre leitura e POST, pois a API nao oferece compare-and-swap. Nao editar o mesmo webhook por outra interface durante a operacao.

Se houver timeout/falha apos tentativa de escrita, NAO repetir apply automaticamente: a gravacao pode ter ocorrido. Consultar estado, preservar backup e revisar. restore recusa sobrescrever configuracao divergente do estado esperado. Restauracao normal retorna somente MESSAGES_UPSERT, preservando os demais campos; requer a mesma autorizacao explicita de execucao.

## Condicoes e coleta

Antes de aplicar: confirmar identidade/flags/URL do webhook e confirmar que a versao publicada do M1M ignora MESSAGES_SET. Alteracao depende de autorizacao especifica do proprietario; o comando continue durante preparacao nao foi tratado como ativacao.

Depois de eventual autorizacao: coletar passivamente somente M1MTesteIA nos logs existentes. Registrar evento, horarios observados, isLatest/progress e contagem do lote; nao exportar lote bruto, conteudo, JIDs, nomes ou apikey. Nenhum reconnect, logout, reinicio ou replay sera provocado automaticamente. Se nao ocorrer MESSAGES_SET naturalmente, registrar ausencia de observacao, sem considerar teste aprovado ou forcar sincronizacao.

MESSAGES_SET identifica um caminho historico; nao distingue replay desconhecido que chegue como MESSAGES_UPSERT. O envelope atual continua sem type/requestId. A proposta e observacao limitada, nao correcao de replay nem prova de que essa falha ocorreu em producao. A reabertura permanece bloqueada, ledger e coleta nova continuam desativados.

## Validacao realizada nesta preparacao

Quatro testes sinteticos aprovados: preservacao da origem/campos, restauracao condicionada, rejeicao de configuracoes nao revisadas e comparacao normalizada. Sintaxe de manage.mjs aprovada. Contrato conferido na fonte publica 2.3.7 (schema exige enabled/url; controlador seleciona webhook por instanceId). Nenhuma chamada POST real, teste PostgreSQL, migration, merge ou deploy executado.


## Operacao especificamente autorizada pelo proprietario

Autorizada inclusao de MESSAGES_SET somente em M1MTesteIA, mantendo MESSAGES_UPSERT e TODOS os demais eventos existentes; com backup anterior e verificacao posterior. Nenhuma autorizacao para webhook global, outras instancias, restart, desconexao, migration, merge ou deploy.

Usar authorized-operation.cjs para esta execucao; plan.mjs/manage.mjs anteriores permanecem como historico de preparacao e nao devem ser usados para impor a lista exata antiga. A nova ferramenta acrescenta SET a lista existente sem remover eventos e compara todos os campos retornados, exceto updatedAt e ordem de chaves/eventos. O modo padrao e inspect. apply realiza a unica alteracao autorizada. restore exige configuracao funcional identica ao estado esperado apos inclusao e retorna lista original. Nenhum segredo e impresso. Se SET ja estiver presente, nenhuma escrita e enviada. Backup existente bloqueia sobrescrita e operacao. Timeout apos POST nao aciona repeticao nem rollback automatico.

Sintaxe validada e seis testes com API/filesystem simulados aprovados: inclusao preservando eventos extras e restauracao; SET existente; backup existente; timeout; alteracao inesperada; inspect somente leitura. Nenhuma execucao real foi feita pelo assistente. O proprietario deve devolver o JSON final; somente esse retorno permitira confirmar o resultado real.

Log de deploy fornecido pelo proprietario identifica c012b46b3075b8722da5f62594337bb1fa60a8fc e Rolling update completed. Rota nesse commit conferida no GitHub: MESSAGES_SET retorna EVENT_IGNORED antes do pipeline apos autenticacao/validacao. Isso nao altera a restricao de nao publicar a branch TF3-A.
