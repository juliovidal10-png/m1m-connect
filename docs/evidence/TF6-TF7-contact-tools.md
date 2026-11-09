# TF6 e TF7 — Ferramentas de contatos

Base do painel `318153d9fcfc498ed320a7c9e6d01037a25a5c13`. TF5 validada em produção com o contato 000375 fora do CRM, sem marca de exclusão, e o número de teste mantendo um único card. TF3 permanece pausada.

## TF6 — Telefone manual no Cliente 360°
O formulário recebia telefone como propriedade sem oferecer edição. Dados do cliente agora oferece Telefone do cliente abaixo de nome e código. Salvar alterações usa a permissão EDIT_CRM e valida DDD/DDI. O valor informado fica em contactPhone, separado de phone e remoteJid usados pela integração. A lista de Contatos também apresenta e encontra o telefone manual. A migração acrescenta apenas uma coluna nullable.

## TF7 — Exportação e importação de contatos
Contatos exporta em CSV UTF-8 os números diretos disponíveis na instância de WhatsApp da empresa, usando a consulta autenticada existente. O arquivo abre no Excel. A importação aceita CSV Nome/Telefone, até 5.000 linhas e 1 MB por arquivo, com permissão EDIT_CRM. Normaliza números, pula registros repetidos por número ou identidade conhecida, preserva os existentes e informa totais. Cria somente cadastros em Contatos, com códigos por empresa. A transação serializável pode ser repetida em caso de conflito. Contatos sem telefone retornado pela conexão ficam fora da exportação. Importação não é verificação de registro no WhatsApp.

Validação local: regressão TF6/TF7 com normalização, LID rejeitado, round-trip CSV, aspas, nomes que parecem fórmulas, reimportação, conflito e deduplicação com Prisma simulado. Regressões de CRM e identidade, TypeScript, schema Prisma e diff check passaram. Deploy e teste em produção pendentes. Próximo passo: salvar telefone no Cliente 360° e reabrir o cadastro. Depois exportar, abrir o CSV e importar uma amostra na empresa de teste, conferindo os totais e a reimportação.

Próxima TF: [adicionar quando surgir]
