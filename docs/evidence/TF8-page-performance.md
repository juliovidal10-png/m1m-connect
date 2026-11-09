# TF8 — Tempo de abertura das telas

Em 09/11/2026, o proprietário relatou lentidão em Dashboard, Conversas, Contatos e CRM. Agenda e Financeiro abriam rápido. Base `39280fb74c2b5d83be4cb43b80afe7094466dae4`. TF7 validada pelo proprietário. O caso do telefone do Jeff em Conversas continua pausado a pedido dele.

- Dashboard pedia contatos completos e enriquecimento do WhatsApp só para contar estados. A visão de Dashboard agora consulta ID e status na empresa autenticada.
- Contatos e CRM renderizam com dados salvos e cache se a consulta de apresentação ao WhatsApp passar de 350 ms. A consulta pendente atualiza o cache após a resposta. A foto consultada individualmente entra pelo Cliente 360° e pelo cache. A espera de autenticação e banco fica fora desse limite.
- CRM obtém as primeiras mensagens em uma consulta por conjunto e carrega os dados detalhados dos cadastros elegíveis. A regra da TF5 e a ordem cronológica permanecem.
- Conversas reaproveita inventário bruto por empresa e instância enquanto atualiza em segundo plano, com tolerância de até 60 segundos após expirar o inventário. A lista recente tem validade própria. Sem inventário disponível, a primeira carga espera a Evolution. Permissões, estados e exclusões são calculados em cada pedido.

TypeScript e regressões locais de Dashboard, CRM, Conversas, identidade e CSV passaram. Testes específicos simulam provedor atrasado, atualização de cache, primeira carga e isolamento. Server-Timing nas rotas permite medir após o deploy manual. Os resultados de latência em produção ainda precisam ser medidos.

## Abertura direta de conversa

Após o primeiro deploy, o proprietário confirmou melhora no Dashboard e relatou espera em Conversas, sobretudo no botão Conversa do Cliente 360°. O clique usava a busca geral mesmo quando o cadastro e a conversa já existiam. A abertura direta consulta o JID exato, os atendimentos e uma mensagem salva da empresa e instância atuais. A autorização, os setores e a exclusão seguem a mesma verificação da lista. Quando o caminho direto não encontra resultado, a busca normal continua disponível. A prévia e a carga do histórico usam o fluxo existente depois de selecionar a conversa.

Na página sem busca, nomes de grupos já conhecidos aparecem pelo cache. Consultas de nomes ausentes ocorrem em lotes de até oito em segundo plano. A busca textual continua consultando os nomes necessários. A resposta direta expõe Server-Timing. TypeScript e regressões de abertura direta, cache, alias e permissões passaram com banco e Evolution simulados. Validação de tempo em produção pendente.

## Contagens concorrentes e tempo dos cards

No print de produção de 09/11, as requisições de navegação das telas selecionadas responderam em 30–40 ms. As contagens de Conversas responderam em 2,28–2,84 s e o CRM em 3,20 s. A lista de Conversas estava cancelada ou pendente no instante do print, sem tempo concluído para comparar.

A primeira página da fila entrega os totais com o mesmo inventário e as mesmas regras de visibilidade. O polling de Conversas evita a segunda chamada de contagem, e a barra lateral usa o resultado recebido na tela. Fora de Conversas, a barra mantém sua consulta. O CRM evita ler o histórico de entrada de cadastros marcados como manuais, projeta apenas os campos de mensagem usados pela prévia e permite concluir a lista quando o histórico de identidade ainda está em consulta. Server-Timing do CRM separa elegibilidade, dados dos cards e identidade. Os testes locais confirmam escopo, filtros, igualdade das contagens e abertura direta. Os tempos após deploy ainda devem ser medidos.
