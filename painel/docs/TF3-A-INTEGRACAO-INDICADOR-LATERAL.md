# TF3-A — integracao opt-in do indicador lateral

No HEAD c34af89d, Sidebar consultava /api/chat/list?totalCount=1, que sempre contava o inventario visual. O endpoint /api/chat/unread-count existia, mas nao era consumido pelo menu. Preparar o ledger isoladamente nao substituia o total acumulado.

Com M1M_TF3A_UNREAD_LEDGER_ENABLED=true, totalCount=1 consulta countUnreadConversations para empresa autenticada e instancia do cadastro dessa empresa. Ignora companyId/instance recebidos na URL, busca, limite e offset. Nao chama inventario Evolution nem depende da configuracao da API Evolution para esse agregado. Retorna totalCount, countKind=unreadConversations e Cache-Control=no-store. Numeros invalidos e falhas de persistencia retornam erro, nunca zero substituto.

O caminho requer VIEW_ALL_CONVERSATIONS, coerente com o endpoint agregado preparado. Usuario restrito a setor recebe 403 antes de consultar o ledger global: nao recebe total da empresa nem zero inventado. Visibilidade por setor permanece pendente e impede ativacao geral.

Sidebar usa o tipo declarado para rotular conversas com mensagens nao lidas, em vez de na aba Todas. Atualiza cinco segundos depois de concluir a requisicao, sem sobreposicao. No legado, preserva intervalo de sessenta segundos e semantica de inventario. Desmontagem cancela nova agenda e atualizacoes tardias. Falhas preservam ultimo valor com status stale; sem valor valido fica unavailable. Nenhum clique ou recibo zera localmente. Zero so vem de resposta valida do servidor. Nao e atualizacao instantanea por push.

Flag permanece DESLIGADA. Nao ativar para testar em clientes. Badges por conversa, reconciliacao inicial, visibilidade por setor, replay desconhecido e reabertura segura nao estao concluidos; agregado nao liberado para uso real. Ledger vazio nao comprova reconciliacao inicial.

## Validacoes

14 cenarios da rota real transpilada com dependencias simuladas: empresa/instancia autenticadas, independencia de paginacao/busca, contagens incluindo zero, permissoes, identidade ausente, contagem invalida e erro de banco sem fabricar zero, flag desligada e fila Aguardando fora do ledger.

Sete cenarios do efeito real extraido da Sidebar com rede, React e timers simulados: valores do servidor, zero confirmado, polling adaptativo, falhas sem zerar, payload invalido e desmontagem. Preservados 14 cenarios do servico (oito originais incluidos), 19 da rota de leitura e teste estrutural. TypeScript, T17 e TF6 aprovados. ESLint sem erros novos; tres warnings preexistentes confirmados na fonte anterior. Nao equivalem a teste visual/end-to-end, PostgreSQL real ou dados de producao.

## Verificacao offline do coletor encerrada

Relatorio M1M_TF3A_BUNDLE_20261027_091605.txt: duas funcoes compiladas aprovadas com dependencias simuladas, extraidas da imagem local sha256:80735ce956451da6e0904fe0498064b9171cf5247bd2ce3bdb09b7d13b9a82d7. Bundle SHA256 9a50f180557a71a88aa1749d72f9e9debe960dbf207668007f6f9e90b2895db3 coincide com o compilado aqui. Container temporario removido sem ter sido iniciado. Nao repetir build ou inspecoes equivalentes.

Isso encerra a verificacao offline, nao a coleta real. Publicacao da Evolution compartilhada continua sem autorizacao; filtro de instancia nao impede reconexao de outras instancias ao substituir o processo. Nenhuma migration, merge, deploy, reinicio, nova ativacao de coleta ou banco real nesta revisao.
