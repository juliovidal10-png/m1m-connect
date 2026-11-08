# TF5 — Regra de criação e exclusão individual de cards

## Ambiente, causa e evidência
Base: `289553ec78b96d5ca5a4077ccc615714224506c9`, Next/Prisma 7.9.0. TF4 aceita pelo proprietário; TF3 permanece pausada.
O proprietário confirmou regressão da regra já corrigida anteriormente. Ponto comprovado no código atual: CrmOperacional carregava /api/customers e só excluía grupos; conversation-sync.service mantém o cadastro técnico para mensagens em ambos os sentidos. Portanto, criar o contato necessário para registrar uma saída também o colocava no CRM. Não se deve impedir o cadastro técnico: isso perderia o vínculo da mensagem. O histórico Git consultado mantém esse comportamento desde o limite disponível de setembro; não foi atribuído um commit específico à reintrodução sem prova.

## Alteração
CRM passa a usar /api/crm/cards, com elegibilidade no servidor por empresa e instância atual. Para entrada automática, a primeira mensagem válida armazenada (ordem sentAt, createdAt, id; ignora REACTION/UNKNOWN) deve ser do cliente. Uma resposta posterior não transforma uma conversa originalmente iniciada pela empresa em entrada automática. Contatos sem mensagem não geram card automático. Não muda /api/customers nem o cadastro técnico de mensagens.
Preserva registros de negócio já preenchidos (empresa, cidade ou observações) e cadastro explícito no Cliente 360° via POST autorizado, registrado em crmManuallyAddedAt. Não usa nome/foto como prova de intenção. Não reativa cards excluídos por novas mensagens nem por simples salvamento do contato.

Excluir card requer EDIT_CRM, a permissão existente para gerir CRM, no servidor e na UI. Confirmação identifica nome/código e quantidades de mensagens, atendimentos, lembretes e comprovantes. A API reconsulta o ID dentro da empresa autenticada e seus vínculos antes de marcar crmCardRemovedAt. Não executa DELETE, cascata ou alterações de relacionamentos. Exclusão repetida é idempotente. Não há exclusão em massa. Contato permanece em Contatos/Cliente 360°, conversa e histórico permanecem acessíveis, agenda/financeiro inalterados.
Migração aditiva: duas colunas nullable em m1m_customers; nenhum backfill, remoção ou alteração retroativa de mensagens. Deploy padrão do painel executa prisma migrate deploy; não requer alteração da Evolution.

## Validação local
- crm-card-lifecycle-regression.mjs: função real de elegibilidade; rotas reais GET/DELETE com autorização real e repositórios simulados; entrada/saída, manual, card removido, falta de permissão, outra empresa, inválido/lote, seleção individual, resposta idempotente e visibilidade após recarga.
- Handler real de UI: uma requisição para o selecionado, atualização da lista no sucesso e preservação na falha; confirmação e ação condicionada à permissão.
- Schema Prisma validado; geração do client e tsc sem erros; diff sem erros de whitespace.
- SQL/Prisma simulados nos testes. Não houve conexão, exclusão ou atualização de dados de produção durante o diagnóstico; migração e plano SQL ainda dependem do ambiente real.

## Pendência e próximo passo
Deploy manual no Coolify. Validar contato iniciado pelo cliente versus contato iniciado pela empresa; preservar cadastro manual legítimo. Excluir um card de teste autorizado, recarregar e confirmar ausência só no CRM e presença em Contatos/Conversa/Cliente 360°, preservando mensagens/agenda/financeiro; usuário sem EDIT_CRM não deve ter botão e DELETE deve ser rejeitado. TF5 permanece em validação até o retorno. TF3 continua pausada; TF4 concluída.

Próxima TF: [adicionar quando surgir]
