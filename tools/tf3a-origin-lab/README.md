# Proposta revisavel — laboratorio de origem TF3-A

Estado: PROPOSTA PRESERVADA, NAO APROVADA COMO DEPENDENCIA DA TF3-A. Nenhum recurso ou ambiente criado.

## Revisao de escopo apos instrucao do proprietario

HEAD confirmado antes desta revisao: 1e481bf7e1ebbeb68d2d825dffd8f80e9aadb555. O codigo deste commit foi preservado. Expansao do laboratorio suspensa.

A necessidade de outra Evolution, Redis ou numero WhatsApp NAO foi demonstrada. M1MTesteIA ja entrega eventos reais no ambiente existente e deve ser a primeira via de coleta. Nao condicionar os testes de persistencia a um numero novo.

- Persistencia: um PostgreSQL de teste isolado pode validar idempotencia, leitura parcial, concorrencia e transacoes sem WhatsApp, Redis ou Evolution novos. A criacao do banco e execucao de migration continuam sujeitas a autorizacao.
- Coleta real: usar primeiro os logs existentes da M1MTesteIA. A coleta no M1M com filtro por instancia limita o escopo, mas nao recupera campos que a Evolution nao envia.
- Instrumentacao de origem restrita por instancia: tecnicamente pode observar type/requestId no servico existente, sem outra sessao. Ainda exige projeto de isolamento, revisao e autorizacao para eventual publicacao/reinicio do servico compartilhado; o preparador offline atual nao e uma patch pronta para o container compartilhado.
- Compartilhamento: o screenshot mostra um recurso Evolution no ambiente production; isso nao comprova quais empresas usam esse recurso. O cliente M1M usa uma configuracao EVOLUTION_API_URL e seleciona instancias por nome. Confirmar inventario ativo antes de afirmar que clientes reais compartilham o processo.
- Consulta suportada na fonte 2.3.7: GET /instance/fetchInstances, com chave global, lista instancias do clientName configurado; GET /webhook/find/M1MTesteIA consulta somente o webhook de testes. Retornar apenas contagens/estado e nomes de eventos, nunca o objeto bruto com tokens.
- Operacoes com possivel impacto global: substituir imagem, reiniciar/parar container Evolution, alterar variaveis globais, banco/cache compartilhados ou emitir logs muito volumosos. Filtro de payload por instancia nao elimina impacto de reinicio/build ou erro global.
- Operacoes restritas: configuracao local de webhook e roteada por instanceName no controlador; mesmo assim nao mudar URL ou eventos sem preservar configuracao e avaliar entrega ao M1M. Nenhuma alteracao foi autorizada nesta revisao.

Nenhuma evidencia indispensavel identificada exige um SEGUNDO numero. Ele so seria necessario para o desenho opcional de duas conexoes independentes simultaneas, que nao e requisito comprovado do contador. Se nao houver outro numero, manter M1MTesteIA na conexao atual, usar coleta existente e testes de persistencia desacoplados; nao transferir nem duplicar sessao. Se metadados internos adicionais forem indispensaveis, apresentar a instrumentacao minima da origem por instancia e seu impacto para autorizacao, em vez de impor infraestrutura nova.

A falha potencial de replay desconhecido permanece aberta; nao foi comprovada por um replay real controlado. Testes simulados e fonte estatica nao substituem essa evidencia. Nao descartar append ou mensagens atrasadas.

Os paragrafos abaixo preservam a proposta original para rastreabilidade; nao representam o proximo caminho aprovado.


Escopo desta entrega: proposta e preparador da instrumentacao de origem. Ainda nao e pacote de deploy pronto; receptor, Compose e imagem final dependem das condicoes listadas abaixo.

Validacoes executadas: aplicacao do preparador ao checkout isolado exato; diff sem erros de whitespace; transpilacao sintatica TypeScript sem erros; segunda execucao recusa sobrescrever fonte modificada; execucao sem argumento interrompe. Nao executados build integral da Evolution, containers, banco, WhatsApp ou testes funcionais de replay. A fonte original revisada tem SHA256 d920d4fdd3cae90cb0369ad501774388388f28475135562f6977628efa913d0c; a instrumentada, b3fbba3344dcda6d611823869d87a173ecb12267ea377677d27bfa92c8d68a1a.

## Objetivo e limite

Observar os eventos internos que a Evolution 2.3.7 omite no webhook. Isso nao e a correcao final do ledger: type=append tambem representa entrega offline legitima, e replay de um evento originalmente novo exige reconciliacao/idempotencia duravel. Nao ativar contador nem reabertura com base apenas nos novos campos.

Base inspecionada: Evolution tag 2.3.7 / commit cd800f2976e1e5b682fbf86a01ee4d85ae61f370; Baileys declarado 7.0.0-rc.9, coerente com consulta do proprietario ao package.json do container.

## Recursos que seriam criados apos autorizacao

Ambiente Coolify `tf3a-lab`, com Evolution 2.3.7 instrumentada, PostgreSQL proprio, Redis proprio e volumes/rede exclusivos. Banco com usuario e senha novos. Sem copia do banco, Redis, arquivos de sessao ou variaveis completas de producao. Sem aplicacao M1M, sem ledger e sem migration M1M neste laboratorio inicial.

A Evolution executa migrations do seu proprio banco no entrypoint. Portanto a publicacao desse laboratorio tambem exige autorizacao explicita para inicializar o banco novo; esta proposta nao autoriza essa execucao.

Usar receptor de evidencias exclusivo do laboratorio, sem encaminhar mensagens ao M1M de producao. Esse receptor, a autenticacao e a configuracao Compose ainda precisam ser preparados e validados antes de liberar qualquer comando de deploy. Nao usar request bin publico.

Nao ha ainda inventario de CPU/RAM/disco disponivel. Build pode disputar recursos com producao no mesmo servidor; um novo ambiente no Coolify sozinho nao isola CPU, RAM ou disco. Antes de provisionar, validar capacidade e limitar recursos, ou preparar build fora do servidor. Nao ha garantia de custo zero nem de impacto zero.

## WhatsApp e sessoes

Nao conectar a mesma sessao simultaneamente na Evolution atual e na nova. Nao copiar credenciais de sessao.

Para independencia real, o laboratorio precisa de numero/aparelho exclusivo ainda nao conectado na producao. A disponibilidade desse numero nao foi confirmada. M1MTesteIA continua vinculada a producao; nao sera movida, desconectada ou substituida automaticamente. Sua eventual transferencia exige plano de retorno e autorizacao especifica. Nenhum teste usa Casa do Criador ou Bee Pipocas.

## Codigo da instrumentacao preparado

`instrument-origin.mjs` recebe checkout ISOLADO da fonte oficial, verifica HEAD exato e integridade do arquivo, e altera apenas o payload de emissao de dois eventos:

- MESSAGES_UPSERT: acrescenta m1mOrigin.schemaVersion=1, handler=messages.upsert, upsertType original e hasRequestId booleano.
- MESSAGES_SET: acrescenta m1mOrigin.schemaVersion=1 e handler=messaging-history.set nos metadados adicionais; preserva isLatest/progress.

Nao muda gravacao Prisma, politica de recebimento, filtros, leitura, timestamps ou dependencias. Metadata e acrescentada somente ao objeto enviado ao webhook, sem gravar campo desconhecido no modelo Prisma de mensagens. Campos novos sao observacionais, nunca prova suficiente para contar ou reabrir.

Nao executar esse script dentro do container compartilhado. Ele nao foi feito para modificar dist/main.js, imagens em execucao ou banco. Exige build de imagem separada da fonte instrumentada. O Dockerfile oficial usa tags base mutaveis; imagem final e bases devem ser fixadas por digest no pacote de publicacao a preparar.

## Cenarios controlados e registros

1. Texto individual novo com marcador de teste unico.
2. Nova mensagem enviada durante interrupcao SOMENTE do laboratorio e entregue na reconexao; registrar type real sem presumir append=history.
3. Sincronizacao historica da sessao exclusivamente de testes; registrar MESSAGES_SET e qualquer MESSAGES_UPSERT associado.
4. Reentrega controlada do mesmo evento e troca de ordem no receptor de laboratorio; sem acionar IA, clientes ou producao.
5. Reaparecimento/ocultacao e leitura parcial serao testados depois, em harness do ledger com PostgreSQL isolado e apos autorizacao da migration de teste. Nao declarar esse fluxo validado a partir da coleta de origem.

Registros: cenario e acao humana correspondente; versao/digest da imagem; evento; instance com alias; m1mOrigin; isLatest/progress; timestamp de origem e de recepcao como observacoes; token estavel por mensagem para correlacao; resultado no receptor. Nao exportar credenciais, nomes, telefones, corpo de mensagens ou midias. Nao inserir a chave recebida no chat em arquivos de teste.

## Impacto, ativacao e remocao

Ativacao futura: publicar somente recursos novos apos revisao do pacote completo e autorizacao; conectar exclusivamente sessao de laboratorio; habilitar coleta no receptor. Nenhuma troca de branch/URL/webhook em producao. O ledger de producao permanece false.

Remocao: parar primeiro o receptor/coleta, encerrar a sessao de laboratorio de forma controlada e parar os recursos novos. Remocao definitiva de bancos/volumes somente apos exportacao sanitizada e confirmacao especifica. Nao apagar recursos ou volumes com nomes de producao. Uma transferencia futura de M1MTesteIA exigiria restaurar seu vinculo conforme plano aprovado; nao esta incluida aqui.

## Condicoes antes de qualquer publicacao

- Numero/sessao exclusivos confirmados ou transferencia da instancia de testes explicitamente autorizada.
- Capacidade do servidor verificada e recursos limitados.
- Receptor, Compose, credenciais novas e imagem instrumentada preparados e testados.
- Revisao dos logs para nao emitir payload/segredos (a Evolution padrao possui logs verbosos).
- Autorizacao para recursos novos e inicializacao do banco Evolution, seguida de deploy manual pelo proprietario.

Esta proposta nao autoriza merge, deploy, migration, desconexao, modificacao de webhook ou criacao de recursos. Primeiro concluir essas preparacoes; depois apresentar o pacote exato para aprovacao.
