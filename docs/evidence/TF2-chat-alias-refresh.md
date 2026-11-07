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
