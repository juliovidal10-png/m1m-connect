# Respostas OpenAI reais — evidência do proprietário

Candidato executado: 707cc30db50b446916449f19fc564010f758e187. Alterações posteriores até 5d36221049846fbea4208ecd1f8419ab7ec893d8 somente documentais.
Arquivo recebido: M1M_INSTRUCAO_OPENAI_RESULTADO_20261029-070733-132.txt.
SHA-256 do arquivo original: 7c3dff6277f0165ca921b5cdd732ffc78fe52619d9cbbfd3891392c59406e4ae.

Execução real pelo proprietário no Windows. Status APROVADO. Modelo retornado: gpt-5-mini-2025-08-07. Contextos sintéticos em memória; builders e provider reais do candidato, incluindo salvaguardas. Nenhuma chave está no relatório. Sem acesso WhatsApp, banco ou navegador nesta execução.

## Seis casos aprovados

- institucional / empresa A / V1: expressão final configurada respeitada; telefone sintético preservado; needsHuman=false; sem emoji. ID de resposta: resp_012c4e5c92081ee3006ae329567ad087d1866a9f0e0a6284eb.
- institucional / empresa A / V2: expressão final configurada respeitada; telefone sintético preservado; needsHuman=false; sem emoji. ID de resposta: resp_0b23251dabfbf905006ae3295b6de087d1868e11b2342cc466.
- institucional / empresa B / V1: expressão final configurada respeitada; telefone sintético preservado; needsHuman=false; sem emoji. ID de resposta: resp_0ce0930aab7314f7006ae32960626887d19efbcb6fceacc251.
- setorial / empresa A / V1: expressão final configurada respeitada; telefone sintético preservado; needsHuman=false; sem emoji. ID de resposta: resp_0e03433c9255ee12006ae329658cd087d1be60faa747257e15.
- setorial / empresa A / V2: expressão final configurada respeitada; telefone sintético preservado; needsHuman=false; sem emoji. ID de resposta: resp_0f9b6903204b0533006ae3297210e487d1bca5a6cbc958dc7d.
- setorial / empresa B / V1: expressão final configurada respeitada; telefone sintético preservado; needsHuman=false; sem emoji. ID de resposta: resp_0b0e2fb8c94e6acf006ae32976a33487d19c9a60682b9fe3a3.

A mudou de Atenciosamente (V1) para Obrigado (V2); B manteve Ate breve. Os dois caminhos respeitaram cada contexto. Cópia temporária removida, conforme relatório.

## Alcance da evidência

Comprova comportamento nas seis respostas observadas. A instrução não foi lida do banco nesta execução; salvamento, autenticação, F5 e isolamento no PostgreSQL/navegador já foram validados em teste separado, com evidência em instrucao-agente-banco-navegador-real.txt. Não é um único E2E de salvar até enviar pelo WhatsApp, nem prova de obediência universal a qualquer instrução. Não houve publicação ou migration em produção.

## Captura do TXT

O texto recebido contém mojibake em é (├®). O wrapper PowerShell não fixava UTF-8 para StandardOutput/StandardError do processo Node. Isso é compatível com erro na captura do relatório, mas não demonstra, isoladamente, a origem dos bytes nem defeito de acentuação no produto. Preservar o original sem correção silenciosa; ajustar a captura em futura revisão do pacote. Não repetir chamadas pagas apenas por esta pendência de relatório.

## Publicação pendente

PR #16 pode ser revisado com as evidências reunidas. Merge e migration em produção continuam dependentes de autorização específica. O start do painel executa prisma migrate deploy; o próximo deploy manual que contiver este candidato poderá aplicar a coluna agentInstructions TEXT nullable. Reversão de código deve preservar a coluna e os textos. Nenhum DROP COLUMN ou limpeza automática.
