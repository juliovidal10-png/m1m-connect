# TF2 — duplicidade de conversas

Base: 5965c80cad5163d6c3aab974faedea16413b2ca7. Empresa/instância confirmadas em produção: empresa-teste / M1MTesteIA.

Evidência: consulta somente leitura encontrou um cadastro por contato investigado. Evolution mantém chats LID e telefone explicitamente relacionados para Cliente M1M Connect. Zap Centro América está único na consulta atual. O evento histórico da captura não foi reconstruído.

Falha reproduzida: a interface conserva duas linhas ao mesclar um snapshot antigo com apenas LID e uma atualização que relaciona esse LID ao telefone. O lote atual já resolvido não reproduz duplicidade.

Alteração: resolver vínculos explícitos no lote antes da mesclagem visual. Não usar nomes/fotos/textos para unir identidades. Ignorar associações contraditórias e participantes de grupos. Sem alterações em registros persistidos.

Validação local: regressão com snapshot antigo, atualização, paginação, ordem inversa, contatos distintos, grupos e vínculos contraditórios; TypeScript sem erros; diff sem erros de whitespace.

Pendência: deploy manual do painel pelo proprietário e validação em produção de uma linha por contato ao atualizar e carregar mais conversas. Testes locais não comprovam resolução em produção.

Próxima tarefa após concluir TF2: TF3 — telefone dos contatos.
Próxima TF: [adicionar quando surgir]
