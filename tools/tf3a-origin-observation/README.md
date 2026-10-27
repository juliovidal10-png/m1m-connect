# TF3-A — observacao minima da origem, por instancia

Estado: candidato OFFLINE; NAO PUBLICADO, NAO AUTORIZADO PARA DEPLOY. Nao cria laboratorio, banco, Redis, numero ou sessao. Preserva o preparador anterior de 1e481bf7.

## Necessidade e limite

O payload real da M1MTesteIA nao inclui type/requestId. Na fonte declarada pelo digest implantado, esses valores existem no handler mas sao omitidos antes do webhook. Observar exclusivamente no M1M nao recupera esses campos. Este candidato permite correlacionar os dois caminhos de emissao com tokens estaveis, inclusive quando o mesmo ID aparece em ambos. Nao comprova por si so que houve replay e nao classifica append como historico nem notify como novo. Classificacao permanece UNCLASSIFIED; ledger continua desligado.

Base exata: cd800f2976e1e5b682fbf86a01ee4d85ae61f370. Digest implantado informado: evoapicloud/evolution-api@sha256:1bd8afc4a6cf48822e6cf02469aeae7bd35a12a6b616eacd1291926307f4d339. A metadata publicada do manifest linux/amd64 declara a mesma revisao. Nao e prova de reproducibilidade ou de ausencia de alteracoes no filesystem vivo.

## Codigo exato e preparacao

- observer.cjs: funcao passiva autocontida; nunca envia requisicoes, altera banco, marca leitura ou modifica input. Erros da coleta sao absorvidos.
- prepare.mjs: verifica HEAD e SHA256 da fonte original, gera um arquivo candidato novo (wx), acrescentando apenas duas chamadas antes das emissoes existentes. Nao modifica o checkout. Nao executar no container de producao.
- observer.test.mjs: dependencias de filesystem simuladas, criptografia real do Node; nao conecta WhatsApp ou banco.

Comandos offline, em checkout separado da Evolution:

```sh
node tools/tf3a-origin-observation/prepare.mjs CHECKOUT_EVOLUTION ARQUIVO_CANDIDATO.ts
node --test tools/tf3a-origin-observation/observer.test.mjs
```

Nao publicar a branch M1M inteira para esta coleta: ela inclui alteracoes funcionais do ledger e migration pendente. Este candidato pertence a fonte Evolution, nao ao entrypoint do M1M.

## Isolamento demonstravel e risco que permanece

Primeira instrucao do observador rejeita toda instancia diferente de M1MTesteIA, antes de ler configuracao ou calcular HMAC. Ativacao exige arquivo local com permissao restrita, enabled=true e segredo de pelo menos 64 caracteres. Nao imprime segredo, corpo, nome, telefone, JID, ID ou requestId bruto. Coleta ate 100 itens por evento, declarando total e truncamento. Um lote truncado nao comprova cobertura completa.

Esse isolamento limita a coleta, NAO o ciclo de vida do container. Publicar uma imagem substituta no servico existente pode interromper as cinco instancias. A fonte oficial executa deploy_database.sh no entrypoint; portanto um redeploy pode tambem executar migrations da Evolution. Esse entrypoint NAO foi removido ou aprovado nesta preparacao. Nao ha procedimento demonstrado que garanta preservar todas as conexoes durante substituicao. Nenhuma publicacao esta liberada sob a restricao vigente de nao afetar clientes.

## Ativacao e desativacao preparadas, NAO executar agora

Somente depois de imagem exata revisada, build validado e publicacao manual especificamente autorizada. A imagem deve iniciar com coleta desligada. As operacoes abaixo seriam executadas no container Evolution instrumentado; nao funcionam para adicionar instrumentacao a imagem atual.

Ativar sem reiniciar (gera segredo local, nao exibe; recusa sobrescrever arquivo):

```sh
node <<'NODE'
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = '/tmp/m1m-tf3a-origin-enable.json';
fs.writeFileSync(path, JSON.stringify({ enabled: true, secret: crypto.randomBytes(32).toString('hex') }), { flag: 'wx', mode: 0o600 });
console.log('COLETA_HABILITADA_SOMENTE_M1MTesteIA');
NODE
```

Desativar sem reiniciar (preserva o segredo para correlacao futura; nao exportar arquivo):

```sh
node <<'NODE'
const fs = require('node:fs');
const path = '/tmp/m1m-tf3a-origin-enable.json';
const cfg = JSON.parse(fs.readFileSync(path, 'utf8'));
cfg.enabled = false;
fs.writeFileSync(path, JSON.stringify(cfg), { mode: 0o600 });
console.log('COLETA_DESABILITADA');
NODE
```

A leitura da configuracao ocorre por evento da instancia-alvo; escrita incompleta resulta em descarte da observacao, nunca interrupcao da entrega. Reiniciar/recriar o container pode perder /tmp. Sem arquivo, a coleta nao opera. Remover a instrumentacao da imagem exigiria nova publicacao e seus riscos; desativar coleta nao remove o codigo. Logs antigos do fornecedor continuam existindo: este candidato nao promete sanitizar logs globais.

## Cenarios e registros necessarios

1. Mensagem individual nova, marcada como cenario pelo operador; origem e ordem observadas, sem inferir novidade pela idade.
2. Entrega legitima atrasada SOMENTE no teste, sem desconectar outras instancias. Ainda nao ha procedimento autorizado para provoca-la; nao executar reconnect.
3. Historico natural: observar messaging-history.set e correlacionar tokens com messages.upsert. Habilitar MESSAGES_SET nao o provoca. Sem ocorrencia, registrar NAO OBSERVADO.
4. Repeticao/ordem invertida do mesmo envelope: somente harness offline, nunca reenviar para webhook de producao.
5. Contagem, leitura parcial, ocultacao e reabertura: testes do consumidor separados; esta coleta nao valida esses comportamentos.

Devolver somente linhas do prefixo [TF3-A ORIGIN EVIDENCE], nome do cenario, periodo observado e acao humana correspondente. Registrar imagem/digest uma vez. Nao devolver arquivo de ativacao, payload bruto ou credenciais. Marcadores isolados nao aprovam a classificacao; exige correlacao com acao conhecida e semantica da origem. Sem autorizacao para substituir o processo compartilhado e seu entrypoint, nao ha acao operacional liberada ao proprietario nesta entrega.

## Verificacao desta preparacao

Cinco testes do observador aprovados (filesystem simulado; HMAC real). Preservados 19 cenarios da rota de leitura e 14 do servico, incluindo os oito originais, mais teste estrutural; persistencia simulada. Preparador aplicado a fonte exata e recusou sobrescrever candidato existente. SHA256 do candidato atual: 235492380bc20b3737c1e06b65d93f47a399fdc8e63a5c90a743d77806a783bc. Fonte original continua limpa. Build integral npm run build (tsc --noEmit e tsup CJS/ESM) aprovado em checkout isolado com npm ci --ignore-scripts e Prisma Client gerado, sem conectar banco. O build avisou que @swc/core nao estava instalado e ignorou o plugin de emitDecoratorMetadata; isso nao foi tratado como prova de compatibilidade de execucao. Nao foi iniciada a aplicacao. Imagem Docker e integracao real continuam nao validadas, pois Docker nao esta disponivel neste ambiente. Nao executados Docker, PostgreSQL real, migrations ou WhatsApp.

A primeira tentativa do build encontrou erros de tipos no codigo gerado; o preparador foi corrigido para declarar explicitamente os campos opcionais observados. O build completo foi repetido e aprovado no candidato de hash acima. Isso nao altera o limite operacional: nao ha imagem nova liberada para publicacao, nem autorizacao para substituir o processo compartilhado. As etapas de ativacao/desativacao sao roteiro de revisao, nao instrucao para executar no servico atual.

## Proxima verificacao operacional: build local, sem publicacao

M1M_TF3A_BUILD_LOCAL_SEM_DEPLOY.ps1 e autocontido (inclui as tres fontes em Base64, sem credenciais). Exige computador da agencia com Git, Node 24 e Docker Desktop ja disponivel no modo Linux. Nao instala essas ferramentas nem inicia Docker automaticamente. Clona a fonte publica exata em pasta temporaria exclusiva, executa testes, npm ci sem lifecycle scripts, gera somente Prisma Client sem banco, compila e constroi uma imagem LOCAL. Nao toca no checkout existente, nao inicia container, nao conecta WhatsApp, nao acessa Coolify e nao faz push/deploy/migration. Pode consumir varios GB de disco e minutos de CPU/rede no computador local. Relatorio TXT na Area de Trabalho, sem abrir automaticamente.

A imagem candidata usa FROM fixado no digest implantado e copia somente dist. Sobrescreve explicitamente ENTRYPOINT para node dist/main.js e CMD vazio, evitando deploy_database.sh e migrations automaticas em eventual partida futura. Essa diferenca de entrypoint e parte da proposta de imagem, nao foi aplicada a producao e exige validacao de runtime antes de qualquer publicacao. Construir a imagem nao valida login, sessoes ou banco.

O script PowerShell foi inspecionado e as fontes incorporadas conferidas; nao foi executado em Windows neste ambiente. A etapa Linux equivalente de instalacao, geracao e compilacao passou; Docker nao esta disponivel aqui. Se faltar dependencia ou qualquer comando falhar, o script interrompe e registra o motivo. Nao executar comandos adicionais para publicar ou iniciar a imagem. Devolver o TXT gerado para revisar build, arquitetura, ImageID e entrypoint.

## Retorno do build Windows em 27/10/2026

O relatorio M1M_TF3A_BUILD_20261027_090212.txt registra termino normal com RESULTADO=BUILD_LOCAL_APROVADO_SEM_INICIAR_CONTAINER e tag m1m-tf3a-origin:review-20261027090348. Isso evidencia conclusao do fluxo segundo os exit codes verificados pelo script; nao e teste de runtime. As saidas nativas ficaram vazias na transcricao, portanto nao ha neste TXT comprovacao detalhada de testes, ImageID, arquitetura ou entrypoint. Nao considerar esses detalhes conferidos a partir desse arquivo.

O helper Run-Checked foi ajustado para encaminhar stdout via Out-Host em execucoes futuras. NAO repetir o build ja concluido. M1M_TF3A_INSPECIONAR_IMAGEM_LOCAL.ps1 consulta somente a tag local informada no retorno e grava explicitamente os campos selecionados em TXT na Area de Trabalho (independente de Start-Transcript). Nao imprime Config.Env nem inspeciona containers. Confere Linux, tag, entrypoint node/dist/main.js, CMD vazio e, se ainda existir, hash da fonte candidata local. Nao inicia Docker, container, build, push ou deploy. O hash da fonte local nao equivale a extracao do conteudo da imagem; limites permanecem explicitos. Script inspecionado estaticamente, sem execucao Windows neste ambiente.
