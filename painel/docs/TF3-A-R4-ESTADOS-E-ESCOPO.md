# TF3-A — candidato R4: estados carregados e visibilidade setorial

Base: 3ee5429491740ecbfa5d4989f3c7656f37b3568a, branch tf3-a-reconstrucao-indicadores-20261026.
Escopo: atualizar estados de todas as conversas ja carregadas, lotes de ate 100, revisoes monotonicamente preservadas, remocao de ocultas/sem permissao e agregado com o mesmo predicado da listagem. Nao altera o classificador de eventos nem ativa o ledger.

## Correspondencia do candidato
Os 14 arquivos de codigo, testes e workflow deste commit foram extraidos do pacote M1M_TF3A_ESCOPO_POSTGRES_R4.ps1 e conferidos contra CANDIDATO_SHA256.json incorporado. O pacote validado tem SHA256 2c4d4d9c2b1588a697e6e1f346c09ffaac07ea6dd1b51b7d63f3b418d9b5eac8. Esta documentacao apenas registra evidencias; nao altera os arquivos testados. Nao publicar o executor, dependencias, arquivos temporarios, credenciais ou dados reais nesta revisao.

## PostgreSQL real isolado
Relatorio recebido: M1M_TF3A_ESCOPO_R4_20261027-135755.txt. Prisma 7.9.0, PostgreSQL Docker local temporario, tabelas de fixture em banco novo e vazio; sem migration da aplicacao. A flag do ledger ficou false; o servico foi chamado explicitamente com escopos sinteticos. Container e rede foram removidos ao fim.

Aprovados: agregado global 237; setor A 118; setor B 118; usuario sem setor 0; outro setor/responsavel removidos do lote; mesmo JID isolado por empresa/instancia; 237 estados consultados em 100/100/37; leitura160, entrada220, oculta180, transferencia186; PENDING para estado ausente; identidade por mensagem local e negacao de associacao ambigua. As alteracoes de leitura/entrada/transferencia nesta R4 sao fixtures SQL, nao eventos WhatsApp nem novos testes de recibos.

### Por que 237 e diferente de 118 + 118
A fixture cria indices 0..236: 119 pares no setor A e 118 impares no B. A conversa de indice20 pertence ao setor A, mas esta atribuida a outro responsavel. Para o mesmo usuario restrito usado nos dois escopos, ela nao esta disponivel nem e dele. Portanto A=119-1=118, B=118 e a uniao visivel desses escopos tem 236. O escopo global VIEW_ALL inclui tambem a conversa20: 237. Nao existe conversa sem setor nessa diferenca; os valores nao foram ajustados para coincidir.

## Evidencias anteriores preservadas
M1M_TF3A_REAL_20261027-133551.txt: servico do ledger com PostgreSQL real, leitura/repeticao, entrada atrasada, duas entradas concorrentes e isolamento. Confirma tambem as lacunas de replay desconhecido e reabertura.
M1M_TF3A_NAVEGADOR_R3_20261027-134144.txt: componente Badge real renderizado no navegador com 237 linhas sinteticas; nao executa Next/Auth/ChatInbox completo.

## Validacao local do R4
TypeScript aprovado. Oito cenarios originais preservados dentro dos 14 do ledger; 19 da rota de leitura, 14 do agregado, efeito da Sidebar incluindo resposta antiga apos troca de escopo, cinco cenarios de listagem, projecao/SSR e regressao T17/TF6 aprovados. Novos testes executam o callback real loadChats extraido da AST com React/rede simulados: item99 preservado apos insercao no topo; leitura160/nova220; remocao180/199 da selecao/busca; lotes finitos; revisao nova protegida; tickets de busca/contexto/cancelamento. Teste de acesso liga parametros SQL e verifica escopo/lotes com Prisma simulado. ESLint tem os mesmos cinco erros e tres avisos no ChatInbox da base, mais um aviso preexistente em list e dois em Sidebar; novos arquivos sem apontamentos. Nao declarar lint limpo.

## Limites e proxima unidade
Ainda nao executado: ChatInbox completo com login, sessao, rotas Next e banco isolado, incluindo trocas de contexto reais. Esta e a proxima unidade exclusiva.
Reconciliacao inicial, proveniencia/replay historico com ID desconhecido e reabertura permanecem pendentes. Nao iniciar essas unidades aqui, nao ativar ledger, nao fazer merge/deploy nem alterar a Evolution compartilhada.
