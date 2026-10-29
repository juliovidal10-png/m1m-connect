# Instrução do agente por empresa — candidato

Base: c757cbd252dff4431a1761e4264f7766fb3c89cf.
Branch local: feat-instrucao-agente-20261028.

## Implementação

Central de Configurações recebe a seção Agente de IA, pois nesta base não havia seção com esse nome. Reaproveita o controle de IA existente e acrescenta textarea próprio, até 20.000 caracteres. Conhecimento e produtos permanecem separados.

Campo nullable `M1MCompany.agentInstructions`, migration aditiva com uma coluna TEXT. A migration foi escrita, mas não executada. Não há alteração de registros existentes nem ativação do ledger.

GET/PUT `/api/agent-instructions` usam empresa do usuário autenticado retornado pela autorização existente. Escrita aceita somente agentInstructions e permite limpar com texto vazio/null. Acesso limitado a administrador/usuário principal por requireAdmin; a permissão MANAGE_AI está explicitamente bloqueada no serviço existente, que foi preservado.

Contextos institucional e setorial consultam a empresa novamente por resposta, sem cache novo. Os dois builders incluem a instrução no systemPrompt e outputGuidance. O provider existente já recebe ambos; sua revisão final inclui outputGuidance. Instrução não entra em authorizedContext, reservado a fatos. Permissões, tomada de atendimento, estado da IA e roteamento determinístico não são alterados por esse texto. Respostas já em geração não são canceladas quando a instrução muda.

## Validação realizada localmente

- Teste agent-instructions-regression: API NextResponse, autorização real, contextos e builders reais. Sessão, consultas e persistência simuladas. Validação de tipo/tamanho, limpeza, releitura, troca A/B, atualização entre prompts, acesso negado e rejeição de companyId no body.
- TypeScript --noEmit: aprovado.
- ESLint dos oito arquivos de produção alterados/novos: aprovado, sem ocorrências.
- TF6 conversation guard: aprovado.
- git diff --check: aprovado.
- Prisma Client gerado localmente para checagem de tipos; sem conexão/migration em banco.

Não comprova PostgreSQL real, navegador, sessão HTTP real ou resposta efetivamente gerada pelo modelo. O teste comprova a passagem da instrução aos prompts, não garante obediência do modelo a todo texto arbitrário.

## Próxima validação real

Usar somente aplicação temporária com banco PostgreSQL novo, duas empresas e usuários sintéticos administrador/atendente. Sem credenciais ou dados de produção e sem Evolution/WhatsApp.

1. Inicializar schema somente nesse banco descartável; autenticar pela tela normal com administrador A.
2. Configurações > Agente de IA: salvar instrução identificável, atualizar página e confirmar texto persistido.
3. Gerar resposta institucional e setorial pelo mecanismo de teste da aplicação; conferir instrução nos prompts e comportamento. Isso exige acesso OpenAI autorizado exclusivamente para teste; nunca substituir por resposta simulada sem indicar.
4. Alterar instrução A e repetir. A resposta seguinte deve receber a nova versão.
5. Autenticar como administrador B, salvar texto diferente, voltar a A e confirmar isolamento.
6. Autenticar como atendente; confirmar recusa de leitura/escrita do endpoint, além da interface desabilitada.
7. Limpar instrução e conferir que o comportamento padrão e conhecimento permanecem.
8. Encerrar apenas os recursos temporários e guardar relatório.

Esta validação ainda está pendente. Workflow preparado executa apenas verificações simuladas e de tipos, sem publicar aplicação ou migrar banco.

## Publicação

Commit/push autorizados pelo proprietário na sequência da entrega do candidato. Merge, execução da migration e deploy não autorizados nem realizados. Publicação manual pelo proprietário somente após validação e autorização aplicável. Conferir plano de migrations antes de deploy: o script start existente executa prisma migrate deploy, portanto publicar esse candidato pode aplicar a migration automaticamente. Para rollback de código após publicação, preservar a coluna e os textos; não executar DROP COLUMN como reversão automática.

A alteração de fotos está em outro worktree e não compõe este candidato.

## Atualização — PostgreSQL e navegador reais aprovados

Evidência funcional no commit remoto 707cc30db50b446916449f19fc564010f758e187:
https://github.com/juliovidal10-png/m1m-connect/actions/runs/40804138342/job/123218915640

A pendência de banco/navegador descrita acima foi concluída nesse ambiente isolado. PostgreSQL 16, Next em desenvolvimento e Chromium reais; sem desativar autenticação ou o aceite normal dos usuários sintéticos. Aplicação sem credenciais OpenAI/Evolution e ledger desligado.

Aprovados: migration aditiva em banco novo; login na tela; salvamento por interface e conferência SQL; releitura após recarregar; atualização posterior pela API; sessões A/B independentes; rejeição de empresa no body; atendente recusado na API e campo desabilitado; escrita sem sessão recusada; limpeza do campo preservando conhecimento e IA desligada.

O primeiro ensaio parou no aceite obrigatório dos usuários sintéticos. O harness foi ajustado para percorrer essa tela; nenhuma verificação do produto foi desativada. O ensaio seguinte passou integralmente. Logs confirmam remoção das linhas sintéticas, parada da aplicação e descarte do container PostgreSQL e da rede do job.

A inclusão nos prompts continua coberta pelo teste de módulos reais com persistência simulada. Respostas efetivamente geradas pela OpenAI continuam pendentes; não houve chamada ao modelo nesta validação. Também não equivale a build de produção ou a fluxo completo de WhatsApp.

Relatório estruturado: instrucao-agente-banco-navegador-real.txt. Alterações posteriores somente documentais podem reaproveitar essa evidência sem repetir a bateria.
