# HTTP 500 em recebimento concorrente — diagnóstico e proposta delimitada

Candidata registrada: 33a6c41e1acd3ad0d964c9b3741cc22930a2b653, branch feat-exclusoes-operacionais-20261030. Publicada pela conexão GitHub após falha de autenticação do push Git local. Tree local/remota idêntica bba3df92296f36b96e6c89c3f6ab8f31b01b0cfb; 44 arquivos incluídos, 34 hashes do snapshot R2.8 conferidos. Parent main 40ebcebb3cbfe7bcf3947e6ccceda991c163b806; main não alterada. Alterações e auxiliares anteriores fora da unidade preservados. Os arquivos deste diagnóstico são posteriores ao commit, não publicados.

## Causa comprovada

1. incoming-message-pipeline.service.ts:process normaliza e identifica empresa/instância, checa acesso e resolve identidade por consultas. Em seguida entra em withDeletionConversation.
2. conversation-deletion.service.ts:withDeletionConversation usa pg_try_advisory_lock; se a conversa está ocupada, lança CONVERSATION_BUSY antes de executar o callback.
3. O callback que chamaria interceptDeletedEvent (persistência da revisão) e processWithoutDeletionGuard (persistência normal) não roda.
4. api/webhooks/evolution/messages/route.ts captura a exceção e devolve HTTP 500. Não há inbox/outbox durável anterior a essa trava no schema/caminho inspecionados.

Evidência R2.8: bloqueio real, resposta 500 e ausência da mensagem no banco antes da reentrega; reentrega deliberada pelo teste criou revisão. Pela ordem do código, nenhuma revisão foi inserida pelo recebimento que falhou. Não há recuperação autônoma garantida no M1M. É necessária nova entrega ou consulta à fonte externa; persistência/retentativa pela Evolution real não foi verificada. Logs não equivalem a fila durável e não garantem reconstrução de mídia/envelope. Não foi usado cliente real nem alterada Evolution.

## Menor correção proposta

Reutilizar m1m_conversation_deletion_reviews como destino durável de evento interceptado especificamente por CONVERSATION_BUSY. Novo motivo CONCURRENT_RECEIPT, sem presumir novidade, sem IA, transferência ou atendimento automático. Persistir payload normalizado/whitelist e chave empresa+instância+ID, sem depender do lock de conversa que acabou de falhar. deletionId pode ficar nulo porque a exclusão pode estar em curso, ser cancelada, ou a disputa ser com outro processamento legítimo. Não rotular esse caso falsamente como UNRESOLVED_IDENTITY.

Somente devolver 2xx/ação de custódia após COMMIT do registro ou confirmação durável de registro/decisão idempotente existente. Se falhar a persistência, continuar retornando erro; nunca confirmar recebimento só em memória ou antes do commit. Capturar apenas CONVERSATION_BUSY para essa recuperação, não transformar falhas arbitrárias em sucesso.

O evento fica disponível no acesso administrativo já existente, com identificação de recebimento concorrente e origem incerta. Repetição mantém um único registro, sem sobrescrever payload original ou decisão. Recuperação é pela revisão administrativa, sem exigir retry externo. Ao revisar, adquirir a trava normal e reavaliar o resultado final da exclusão. Se estiver comprovadamente no manifesto histórico, impedir sua importação. Se já existir como mensagem persistida, reconhecer sem duplicar nem criar evento operacional. Retomada manual importa apenas o evento escolhido com origem incerta e sem IA; descarte retém a decisão mínima. Preservar bloqueio HUMANO e isolamento de empresa/instância. Se identidade continuar indefinida, exigir associação administrativa comprovável, sem palpite.

## Necessidade de schema e impacto

O CHECK atual limita reason a UNCERTAIN_ORIGIN/UNRESOLVED_IDENTITY e permite deletionId nulo apenas para UNRESOLVED_IDENTITY. Não é correto reutilizar um motivo falso nem escrever o payload nas mensagens normais/atendimentos para evitar a proteção. A proposta amplia exatamente dois CHECKs na tabela de revisão existente. Não cria tabela, coluna, enum Prisma, índice, fila externa ou configuração de cliente. As colunas Prisma são String; não exigem expansão do modelo. Sem backfill e sem UPDATE/DELETE de linhas. Registro durável e processamento idempotente usam a unicidade já existente.

Arquivos SQL revisáveis: recebimento-concorrente-revisao-proposta.sql e recebimento-concorrente-revisao-rollback.sql. Ambos NÃO EXECUTADOS. A proposta identifica as duas constraints originais pelo catálogo e falha se o schema for divergente; tudo em transação, lock_timeout 2s e statement_timeout 15s. ALTER TABLE exige lock exclusivo breve, portanto qualquer ambiente compartilhado exigiria análise/autorização próprias. Nenhuma operação compartilhada proposta nesta etapa.

Riscos: aumento de armazenamento por pendência e latência de persistência; locks de linha por deduplicação; evento pode tornar-se histórico/já persistido enquanto aguarda, exigindo rechecagem; falha do banco não permite ACK seguro. Rollback só permitido se não existir nenhum registro CONCURRENT_RECEIPT; caso contrário deve preservar registros/capacidade de revisão. Não apagar eventos para viabilizar rollback. Retornar ao aplicativo R2.8 após criar pendências novas não é rollback seguro; manter leitor compatível e ingresso durável até resolver as pendências.

## Validação seguinte, condicionada à autorização adicional

Aplicar SQL original + esta ampliação exclusivamente em bancos novos/isolados/sintéticos. Registrar hash de ambos. Testar recebimento bloqueado com COMMIT da revisão antes do 2xx, ausência de mensagem/IA/atendimento, encerramento e reinício do processo sem reenviar webhook e revisão ainda disponível; repetição, descartados e retomados sem recriação; falha de persistência sem 2xx; disputa de duas decisões; histórico conhecido e mensagem já persistida; exclusão confirmada/cancelada; grupos, empresa/instância cruzadas e HUMANO ativo. Repetir somente cenários diretamente afetados. R2.8 não será reclassificada como pronta.

## Estado e próxima ação

Commit/push da candidata concluídos. Merge, SQL em banco compartilhado, ativação e deploy NÃO realizados/NÃO autorizados. Nenhum SQL adicional foi executado, nem no WASM. Nenhuma correção funcional posterior foi publicada. Contatos/limpeza em massa permanecem fora desta unidade.

Dependência real: autorização específica para incorporar e executar a ampliação dos dois CHECKs somente em bancos novos, isolados e descartáveis para implementar/validar a recuperação durável. Não é necessária ação no Coolify. Após autorização, preparar o executor isolado com um único TXT na Área de Trabalho e sem logs separados.

SHA256 proposta: a93790c9c4481a1c1b3eb52f303c7e4c1e830baa3a745f046c647866cd7b476e
SHA256 rollback: 0b1c012b8cef7ef2b5b796b4d2db7ab73ee4fbdd9deccd0f93423f5f714fc385
