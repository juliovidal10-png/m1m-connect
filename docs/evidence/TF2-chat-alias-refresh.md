# TF2 — duplicidade de conversas

Base: 5965c80cad5163d6c3aab974faedea16413b2ca7. Empresa/instância confirmadas em produção: empresa-teste / M1MTesteIA.

Evidência: consulta somente leitura encontrou um cadastro por contato investigado. Evolution mantém chats LID e telefone explicitamente relacionados para Cliente M1M Connect. Zap Centro América está único na consulta atual. O evento histórico da captura não foi reconstruído.

Falha reproduzida: a interface conserva duas linhas ao mesclar um snapshot antigo com apenas LID e uma atualização que relaciona esse LID ao telefone. O lote atual já resolvido não reproduz duplicidade.

Alteração: resolver vínculos explícitos no lote antes da mesclagem visual. Não usar nomes/fotos/textos para unir identidades. Ignorar associações contraditórias e participantes de grupos. Sem alterações em registros persistidos.

Validação local: regressão com snapshot antigo, atualização, paginação, ordem inversa, contatos distintos, grupos e vínculos contraditórios; TypeScript sem erros; diff sem erros de whitespace.

Pendência: deploy manual do painel pelo proprietário e validação em produção de uma linha por contato ao atualizar e carregar mais conversas. Testes locais não comprovam resolução em produção.

Próxima tarefa após concluir TF2: TF3 — telefone dos contatos.
Próxima TF: [adicionar quando surgir]

## Continuação — API e alcance geral

Deploy 4914c41 confirmado pelo Coolify; proprietário informa duplicidades persistentes. Inventário Evolution completo: 591 chats, 157 pares explicitamente vinculados, zero JIDs exatos repetidos, zero vínculos contraditórios; amostra de 20 pares consolidada localmente de 40 para 20 linhas. Isso não comprovou a resolução em produção.

Resposta autenticada do painel: 410 linhas, dez grupos por semelhança de nome (seleção para inspeção, não prova de identidade). Growtalks, CM Automóveis e Castrillon têm telefone canônico idêntico e cadastros CRM divergentes. getEnrichedChatKey usa crmCustomerId e mantém essas linhas separadas antes da paginação.

Correção local: usar identidade WhatsApp canônica na chave da lista, como a interface, sem modificar registros CRM. Regressão falha no código publicado (2 linhas em vez de 1) e passa na versão corrigida; TypeScript e regressão da interface passam. Pronto para integração; deploy manual e validação em produção pendentes.

Distinções preservadas: canais Pinterest têm IDs newsletter diferentes; jotta importados contém um grupo e um contato individual. Sem autorização/evidência para excluir ou unir essas entidades.

Pendência: consultas ao histórico do painel e às chaves lid-mapping recíprocas da instância não confirmaram vínculos para os cinco LIDs sem alternativo investigados. Essas identidades permanecem separadas; a ausência de confirmação não prova pessoas distintas. Integrar a correção comprovada da API e validar em produção; TF2 permanece aberta, TF3 não iniciada.

## Continuação — vínculo histórico da Evolution

Produção confirmou commit 8aae90e. A nova resposta tem sete grupos por semelhança de nome; os três pares antes explicitamente ligados com cadastros CRM divergentes não aparecem mais nessa seleção. Não confundir comparação por nome com prova de duplicidade.

Consulta findMessages da Evolution confirmou vínculo LID/telefone para Tiago. O segundo LID Imed aponta para telefone diferente do primeiro; sem evidência para uni-los. A consulta diagnóstica foi incompleta por repetição de IDs WhatsApp; isso não invalida os pares explícitos observados, nem comprova ausência de outros vínculos.

Alteração: resolver identidade individual usando pares explícitos do histórico Evolution antes do enriquecimento/consolidação da API. Nenhum nome, número presumido ou ID de CRM é usado para inferir correspondência. Inspecionar todas as linhas retornadas, mesmo com key.id repetido. Preservar grupos/canais, conflitos e dados persistidos.

Limites: amostra de 100 registros por LID, no máximo quatro novas consultas por chamada, timeout de 2,5s em paralelo, cache limitado a 2.000 entradas e separado por servidor/empresa/instância/LID; positivo por cinco minutos, ausência por um minuto, falha por 15s. Ausência em amostra não prova pessoas distintas. Links confirmados não são descartados por falha temporária ou ausência em amostra posterior; conflitos observados não são usados. Descoberta progride em atualizações subsequentes. Não é uma varredura histórica completa.

Validação local: regressões de histórico e integração com consolidação real da API, IDs repetidos, vínculo inverso, ausência, conflitos, filtro indevido, falha de provedor, limite de consultas, cache e isolamento; regressões API/interface e TypeScript passaram.

Pendências: deploy manual e validação em produção. LIDs sem vínculo confirmado permanecem abertos na TF2. Não iniciar TF3.

## Limpeza específica solicitada pelo proprietário

Após deploy 2700be0, proprietário confirmou melhora da lista e pediu retirar somente linhas anônimas com a saudação histórica. Diagnóstico inicial selecionou 87 linhas por falta de identificação, com saída limitada a 50; não constitui autorização/evidência para apagar 87 cadastros.

Consulta somente leitura completa do lote de 29/10 retornou 30 cadastros: 16 com exatamente uma mensagem de saída (saudação), zero entradas, sem outras instâncias, sem atendimento ativo ou agenda; 14 têm histórico real e são preservados. IDs, JIDs e horários dos 16 estão no manifesto versionado src/lib/legacy-greeting-manifest.ts. Um dos IDs do lote tem alias posteriormente resolvido; uma identidade confirmada prevalece e impede ocultação.

Alteração: exclusão reversível apenas da lista principal, restrita a empresa-teste / M1MTesteIA e ao manifesto fechado. Sem DELETE, UPDATE, migração, união de cadastros ou alteração no provedor. Consulta revalida cadastro, contagem total de mensagens em todas as instâncias, saudação/direção/tipo/horário exatos, agenda, financeiro, atendimento ativo e dados comerciais. Mensagem e timestamp da Evolution devem corresponder à única mensagem armazenada; chat com ID do provedor ou identificação confirmada não é ocultado. Busca e histórico direto preservados; qualquer nova atividade/dados/vínculo desfaz a ocultação. Outros 14 cadastros com histórico e demais itens dos 87 não são incluídos.

Validação local: regressão dos 16 snapshots, outras empresas/instâncias, dependências, atendimento, busca, nova mensagem/identificação e não mutação; regressões anteriores da TF2 e TypeScript passaram.

Pendência: deploy manual e confirmação em produção da limpeza autorizada. TF2 permanece ativa até essa validação. Próxima tarefa após conclusão: TF3.
