# TF4 — Receber e exibir figurinhas

## Ambiente e evidência
Base do painel: `58550b3ace016febe95e629ae90614fea306bfe2`; Evolution conhecida `m1m-evolution:2.3.7-status-ack-identity-r2` (2.3.7/Baileys rc9). TF3 pausada a pedido do proprietário, sem declarar recuperação completa de telefone/foto. TF4 é a tarefa ativa.

Diagnóstico de código: conversation-sync.service.ts já mapeava stickerMessage para STICKER, preservava payload, remetente, identificadores e horário. MessageRenderer.tsx não possuía ramo de figurinha: terminava em UnsupportedMessage. Prévia também caía em Mensagem.

## Alteração
Componente de figurinha usa o mesmo useMediaLoader e a rota autenticada /api/chat/media, sem alterar descriptografia, cache ou isolamento. Renderização nativa de WebP (estático/animado), PNG, JPEG e GIF, com proporção e transparência preservadas. SVG/HTML/Lottie e outros formatos têm indicação explícita; falha de download e falha de decodificação têm avisos próprios. Texto junto permanece na mesma mensagem. Mensagens de texto adjacentes continuam no fluxo normal. Prévia e citação reconhecem Figurinha. Normalização identifica o nó real stickerMessage mesmo sem messageType e preserva legenda quando fornecida. Nenhuma migração/limpeza ou gravação retroativa.

## Validação local
node tests/regression/sticker-message-regression.mjs: normalizador e renderizador reais; figurinha sozinha e com texto/legenda; payload reconstruído de JSON; remetente de grupo, ID e horário preservados; WebP animado sem conversão; formato não suportado; erro/carregamento; ramos de áudio/foto/vídeo/documento e texto normais.
tsc --noEmit --incremental false: passou. Testes simulam download; não comprovam download, reprodução animada no navegador nem recebimento em produção.

## Pendência e próximo passo
Deploy manual do painel pelo proprietário. Em empresa/instância confirmadas, enviar uma figurinha sozinha e outra seguida de texto (ou com texto quando o aplicativo permitir); conferir remetente, horário, ordem e aparência, recarregar e conferir novamente. Confirmar uma mídia existente de áudio, foto e vídeo. Não reconectar WhatsApp nem alterar Evolution para esta tarefa. TF4 permanece em validação até esse retorno; próxima TF após conclusão: TF5 — CRM.

Próxima TF: [adicionar quando surgir]
