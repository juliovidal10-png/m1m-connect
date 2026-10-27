# TF3-A — badges por conversa, opt-in e por revisao

Base remota confirmada: bd25b48d, branch tf3-a-reconstrucao-indicadores-20261026. A fonte existente foi preservada; nao houve reset do checkout ou mudanca na main.

## Causa comprovada no codigo

A listagem mantinha unreadCount da Evolution e os merges escolhiam contagem pela data da ultima mensagem (ou Math.max em empate no backend). Uma leitura pode mudar o contador sem mudar essa data. Portanto uma contagem antiga podia prevalecer mesmo depois de existir um estado mais recente no ledger. O mapeamento da lista ainda convertia null em zero.

## Implementacao preparada

conversation-unread-projection.service.ts consulta estados em lote por empresa autenticada, instancia cadastrada e JIDs canonicos ja resolvidos. Usa contagem e revision do mesmo estado que alimenta o agregado lateral. Nao infere contagem pela idade, ID desconhecido ou ultima mensagem. Nao grava estado, nao confirma leitura e nao classifica eventos.

A projecao ocorre depois da visibilidade por setor e antes da deduplicacao/paginacao, inclusive nas buscas direta, de grupos e completa. Estados ocultos sao excluidos sem modificar readAt. Sem estado/identidade correspondente, retorna unreadCount=null e unreadSource=PENDING; nao copia inventario nem fabrica zero. Estado invalido ou duplicado provoca erro em vez de contagem parcial silenciosa. A fila Aguardando conserva o criterio de atendimento HUMANO sem responsavel; sob a flag, aplica tambem o mesmo filtro de ocultacao.

conversation-unread-snapshot.ts fornece o mesmo seletor para backend e frontend. Na mesma identidade, maior revision vence independentemente do timestamp da mensagem e da ordem de chegada. Empate com contagens divergentes ou identidades conflitantes fica PENDING, sem escolher maximo ou zero. O caminho sem metadados de ledger conserva as regras legadas.

ChatInbox preserva null e encaminha a origem do contador. ChatConversationSidebar e ConversationList usam ConversationUnreadBadge: valor positivo exibe badge numerico, zero confirmado nao exibe badge e PENDING exibe reticencias com descricao acessivel de contagem pendente. A interface nao apresenta nomes de banco, flags ou outros detalhes internos. Nao foi feito teste visual em navegador.

Com flag desligada, listagem nao consulta a projecao do ledger e os badges legados validos permanecem. Nenhuma flag foi ativada, migration executada, merge ou deploy realizado.

## Evidencias de teste

- Rota real transpilada com servico de projecao real e persistencia/Evolution simuladas: lote de 60 ocultas antes de duas visiveis, preservacao de offset/hasMore, estado ausente pendente, busca direta, permissao de setor antes da consulta ao ledger e flag desligada sem consulta ao ledger.
- Servico real com Prisma simulado: contagem exata/zero, grupos, ausencia de identidade/estado, ocultacao, lote unico, isolamento empresa/instancia, estado invalido/duplicado, lista vazia e imutabilidade do input.
- Merges reais extraidos das fontes backend/frontend: leitura com revision maior e timestamp antigo, repeticao em ambas as ordens, nova entrada de revision maior e conflitos sem regressao artificial de leitura.
- Componente real renderizado via React SSR: pendencia, zero, positivo e comportamento legado. Isso nao e teste de navegador.
- Reexecutados os oito cenarios originais dentro dos 14 do servico, 19 da leitura, 14 do agregado lateral, sete do efeito da Sidebar e teste estrutural. TypeScript aprovado. T17/TF6 reexecutados.
- ESLint: cinco erros e oito warnings nos arquivos antigos, iguais aos da base remota consultada. Nenhum erro/warning novo nos arquivos adicionados ou alterados. Nao declarar lint global limpo.

## Limites que impedem ativacao

Nao validados: PostgreSQL real, concorrencia real, identidade JID/LID em producao, bootstrap/reconciliacao inicial, replay historico desconhecido, reabertura por mensagem nova e agregado para usuarios restritos a setor. Filtrar estado oculto conhecido nao comprova resolucao de uma identidade LID sem vinculo.

O frontend existente preserva a cauda da lista ja carregada alem de 100 itens durante refresh. Esta revisao corrige o merge dos estados recebidos, mas ainda nao garante nova consulta de todos esses estados preservados. Esse ponto permanece pendente antes da ativacao. O limite existente de 50 paginas por varredura do backend nao foi ampliado; testes de paginacao nao comprovam cobertura de inventarios ilimitados ou reordenacao concorrente.

Ledger continua DESATIVADO. O agregado lateral pode ser numericamente vazio sem existir reconciliacao inicial; nao ativar nem interpretar ausencia de estados como todas as conversas lidas. A verificacao offline da imagem Evolution ja foi encerrada; nao repetir build, consulta de digest ou inspecao equivalente. Publicacao compartilhada/coleta real continuam sem autorizacao e nao foram realizadas.
