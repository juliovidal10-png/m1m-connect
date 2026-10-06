import OpenAI, { toFile } from "openai";

export type AIProviderInput = {
  systemPrompt: string;
  userPrompt: string;
  authorizedContext: string;
};

export type AIProviderHumanHandoffReason =
  | "CUSTOMER_REQUEST"
  | "INFORMATION_UNAVAILABLE"
  | "HUMAN_ACTION_REQUIRED"
  | "BUSINESS_RULE"
  | "OTHER";

export type AIProviderHandoffReason =
  | "NONE"
  | AIProviderHumanHandoffReason;

type AIProviderUsage = {
  responseId: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;

};

export type AIProviderResult =
  | (AIProviderUsage & {
      text: string;
      needsHuman: false;
      handoffReason: "NONE";
      subject: null;
      context: null;
    })
  | (AIProviderUsage & {
      text: string;
      needsHuman: true;
      handoffReason: AIProviderHumanHandoffReason;
      subject: string | null;
      context: string | null;
    });

type StructuredAIResponse =
  | {
      replyText: string;
      needsHuman: false;
      handoffReason: "NONE";
      subject: null;
      context: null;
    }
  | {
      replyText: string;
      needsHuman: true;
      handoffReason: AIProviderHumanHandoffReason;
      subject: string | null;
      context: string | null;
    };

type SocialTone = "NONE" | "THANKS" | "SOLIDARITY" | "APPROVAL" | "CELEBRATION" | "FAREWELL";

const SOCIAL_TONES: SocialTone[] = [
  "NONE", "THANKS", "SOLIDARITY", "APPROVAL", "CELEBRATION", "FAREWELL",
];

// Aplica estilo somente a respostas sociais, sem alterar estado ou conhecimento.
function composeSocialReply(
  replyText: string,
  intent: "SOCIAL" | "CLOSING" | "OTHER",
  tone: SocialTone,
  conversationHistory: string,
) {
  const emojiPattern = new RegExp(String.raw`(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)`, "gu");
  const text = replyText.replace(emojiPattern, "").replace(/[ \t]+/g, " ").trim();
  if (!text || intent === "OTHER" || tone === "NONE") return text;
  // Despedida precisa da classificacao CLOSING; SOCIAL nao recebe aceno.
  if (tone === "FAREWELL" && intent !== "CLOSING") return text;
  const effectiveTone = intent === "CLOSING" ? "FAREWELL" : tone;
  const palettes: Record<Exclude<SocialTone, "NONE">, string[]> = {
    THANKS: ["😊", "🙂"],
    SOLIDARITY: ["🤝", "👊"],
    APPROVAL: ["👍", "👌"],
    CELEBRATION: ["🙌", "🎉"],
    FAREWELL: ["👋", "🙂"],
  };
  // Historico ja chega limitado ao atendimento e a empresa pelo chamador.
  // Considera so as ultimas respostas do atendimento, nunca emoji do cliente.
  const recentReplies = conversationHistory.split(/\r?\n/)
    .filter((line) => /^\s*ATENDIMENTO\s*:/i.test(line)).slice(-3);
  const recentEmojis = recentReplies.flatMap((line) => line.match(emojiPattern) || []);
  const candidates = palettes[effectiveTone];
  const selected = candidates.find((emoji) => !recentEmojis.includes(emoji));
  // Se todas as opcoes pertinentes ja foram usadas, evita repeticao sem rotacao artificial.
  return selected ? `${text} ${selected}` : text;
}

function requireText(
  value: string | null | undefined,
  fieldName: string,
) {
  const normalizedValue =
    value?.trim();

  if (!normalizedValue) {
    throw new Error(
      `${fieldName} é obrigatório.`,
    );
  }

  return normalizedValue;
}

function getClient() {
  const apiKey =
    process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "A variável OPENAI_API_KEY não está configurada.",
    );
  }

  return new OpenAI({
    apiKey,
  });
}

function parseStructuredResponse(
  value: string,
): StructuredAIResponse {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(
      "A OpenAI retornou uma resposta estruturada inválida.",
    );
  }

  if (
    !parsed ||
    typeof parsed !== "object"
  ) {
    throw new Error(
      "A OpenAI retornou uma resposta estruturada inválida.",
    );
  }

  const record =
    parsed as Record<string, unknown>;

  const replyText =
    typeof record.replyText === "string"
      ? record.replyText.trim()
      : "";

  if (!replyText) {
    throw new Error(
      "A OpenAI não retornou o texto da resposta ao cliente.",
    );
  }

  if (
    typeof record.needsHuman !==
    "boolean"
  ) {
    throw new Error(
      "A OpenAI não retornou uma decisão válida de atendimento humano.",
    );
  }

  const allowedReasons =
    new Set<AIProviderHandoffReason>([
      "NONE",
      "CUSTOMER_REQUEST",
      "INFORMATION_UNAVAILABLE",
      "HUMAN_ACTION_REQUIRED",
      "BUSINESS_RULE",
      "OTHER",
    ]);

  const handoffReason =
    typeof record.handoffReason ===
      "string" &&
    allowedReasons.has(
      record.handoffReason as AIProviderHandoffReason,
    )
      ? (record.handoffReason as AIProviderHandoffReason)
      : null;

  if (!handoffReason) {
    throw new Error(
      "A OpenAI não retornou um motivo válido para a decisão de atendimento humano.",
    );
  }

  const subject =
    typeof record.subject === "string"
      ? record.subject.trim() || null
      : null;

  const context =
    typeof record.context === "string"
      ? record.context.trim() || null
      : null;

  if (!record.needsHuman) {
    if (
      handoffReason !== "NONE" ||
      subject !== null ||
      context !== null
    ) {
      throw new Error(
        "A decisão estruturada da IA é inconsistente para atendimento sem handoff.",
      );
    }

    return {
      replyText,
      needsHuman: false,
      handoffReason: "NONE",
      subject: null,
      context: null,
    };
  }

  if (handoffReason === "NONE") {
    throw new Error(
      "A decisão estruturada da IA é inconsistente para atendimento com handoff.",
    );
  }

  return {
    replyText,
    needsHuman: true,
    handoffReason:
      handoffReason as AIProviderHumanHandoffReason,
    subject,
    context,
  };
}

function extractCurrentCustomerMessage(userPrompt: string) {
  const marker = "MENSAGEM ATUAL DO CLIENTE:";
  const markerIndex = userPrompt.lastIndexOf(marker);

  return markerIndex < 0
    ? ""
    : userPrompt.slice(markerIndex + marker.length).trim();
}
function extractPreviousCustomerMessage(userPrompt: string) {
  const marker = "MENSAGEM ATUAL DO CLIENTE:";
  const markerIndex = userPrompt.lastIndexOf(marker);

  if (markerIndex < 0) {
    return "";
  }

  const previousCustomerMessages = userPrompt
    .slice(0, markerIndex)
    .split(/\r?\n/)
    .filter((line) => line.startsWith("CLIENTE: "))
    .map((line) => line.slice("CLIENTE: ".length).trim())
    .filter(Boolean);

  return previousCustomerMessages.at(-1) ?? "";
}

function extractNaturalGreeting(value: string) {
  const normalized = normalizeBehaviorText(value);

  if (/\bbom dia\b/.test(normalized)) {
    return "Bom dia!";
  }

  if (/\bboa tarde\b/.test(normalized)) {
    return "Boa tarde!";
  }

  if (/\bboa noite\b/.test(normalized)) {
    return "Boa noite!";
  }

  return null;
}

function normalizeBehaviorText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9?\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasExplicitNewRequest(value: string) {
  const normalized = normalizeBehaviorText(value);

  if (!normalized) {
    return false;
  }

  if (value.includes("?")) {
    return true;
  }

  return /\b(qual|quais|como|quando|onde|porque|por que|pra que|para que|quanto|quantos|quanta|quantas|quem)\b/.test(
    normalized,
  );
}

function isPureCourtesyWithoutNewRequest(value: string) {
  if (hasExplicitNewRequest(value)) {
    return false;
  }

  const normalized = normalizeBehaviorText(value);

  return /^(?:(?:perfeito|certo|beleza|combinado|ok|okay)[,\s]+)?(obrigad[oa]|muito obrigad[oa]|muitissimo obrigad[oa]|valeu|vlw|agradeco|agradecido|agradecida|grato|grata|brigad[oa]|obrigad[oa] demais|valeu demais)$/.test(
    normalized,
  );
}

function isStrongContextualConfirmationWithoutNewRequest(value: string) {
  if (hasExplicitNewRequest(value)) {
    return false;
  }

  const normalized = normalizeBehaviorText(value);

  if (!normalized || /^(sim|ok|okay|blz|beleza|feito)$/.test(normalized)) {
    return false;
  }

  return (
    /^(sim|ok|okay|blz|beleza|perfeito|certo|combinado|feito|confirmo)\b/.test(
      normalized,
    ) &&
    /\b(vou|irei|envio|enviar|mando|mandar|faco|fazer|pode deixar|confirmo|ja fiz|feito)\b/.test(
      normalized,
    )
  ) ||
    /\b(vou enviar|vou mandar|irei enviar|irei mandar|envio sim|mando sim|pode deixar|ja fiz|confirmo)\b/.test(
      normalized,
    );
}

function stripQuestionsForResolvedStage(value: string) {
  const parts = value
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts
    .filter((part) => !part.includes("?"))
    .join(" ")
    .trim();
}

function keepOnlyFirstRequestedInformation(
  replyText: string,
) {
  const firstQuestionMark =
    replyText.indexOf("?");

  if (firstQuestionMark < 0) {
    return replyText;
  }

  const throughFirstQuestion =
    replyText
      .slice(0, firstQuestionMark + 1)
      .trim();

  const sentenceBoundaryPattern =
    /[.!](?=\s|$)|\n/g;
  let questionStart = 0;

  for (const match of throughFirstQuestion.matchAll(sentenceBoundaryPattern)) {
    if (typeof match.index === "number") {
      questionStart = match.index + match[0].length;
    }
  }

  const prefix =
    throughFirstQuestion
      .slice(0, questionStart)
      .trim();

  let question =
    throughFirstQuestion
      .slice(questionStart)
      .trim();

  const compoundQuestionPattern =
    /\s+e\s+(qual(?:\s|$)|quais(?:\s|$)|quando(?:\s|$)|onde(?:\s|$)|como(?:\s|$)|quem(?:\s|$)|quanto(?:s|a|as)?(?:\s|$)|por\s+que(?:\s|$)|você(?:\s|$)|voce(?:\s|$))/i;

  const compoundMatch =
    compoundQuestionPattern.exec(question);

  if (
    compoundMatch &&
    typeof compoundMatch.index === "number"
  ) {
    question =
      `${question.slice(0, compoundMatch.index).trim()}?`;
  }

  const menuInsideParenthesesPattern =
    /\s*\(([^()]*(?:,|\/)[^()]*\bou\b[^()]*)\)\s*\?$/i;
  const menuInsideParenthesesMatch =
    menuInsideParenthesesPattern.exec(question);

  if (
    menuInsideParenthesesMatch &&
    typeof menuInsideParenthesesMatch.index === "number"
  ) {
    question =
      `${question.slice(0, menuInsideParenthesesMatch.index).trim()}?`;
  }
  return [
    prefix,
    question,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalizeFactualEvidenceText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRequestedService(currentMessage: string) {
  const normalized = normalizeFactualEvidenceText(currentMessage);

  const match = normalized.match(
    /\b(?:voces|a empresa|a loja)\s+(?:fazem|faz|oferecem|oferece|prestam|presta|trabalham com|desenvolvem|desenvolve)\s+(.+?)(?:\?|$)/,
  );

  return match?.[1]?.trim() || null;
}

function hasExplicitNegativeServiceEvidence(
  authorizedContext: string,
  requestedService: string,
) {
  const context = normalizeFactualEvidenceText(authorizedContext);
  const service = normalizeFactualEvidenceText(requestedService);

  if (!service || !context.includes(service)) {
    return false;
  }

  const escapedService = service.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const patterns = [
    new RegExp(`\\bnao\\s+(?:fazemos|oferecemos|prestamos|trabalhamos com|desenvolvemos)\\s+(?:[^.\\n]{0,80}\\s)?${escapedService}\\b`),
    new RegExp(`\\b${escapedService}\\b[^.\\n]{0,80}\\bnao\\s+(?:fazemos|oferecemos|prestamos|trabalhamos com|desenvolvemos|e|esta|faz parte|oferecido|oferecida|disponivel)\\b`),
    new RegExp(`\\bservicos?\\s+nao\\s+(?:prestados?|oferecidos?)\\b[^.\\n]{0,160}\\b${escapedService}\\b`),
  ];

  return patterns.some((pattern) => pattern.test(context));
}

function enforceAuthorizedFactBinding(
  replyText: string,
  currentMessage: string,
  authorizedContext: string,
) {
  const normalizedMessage =
    normalizeFactualEvidenceText(currentMessage);
  const normalizedReply =
    normalizeFactualEvidenceText(replyText);

  const relationPattern =
    /\b(?:inclui|incluem|incluir|contem|faz parte|fazem parte|vem com|possui)\b/;

  const relationMatch = relationPattern.exec(normalizedMessage);

  const affirmativeRelation =
    /^(?:sim\b|isso\b|correto\b|exato\b)/.test(
      normalizedReply,
    ) &&
    relationPattern.test(normalizedReply);

  if (!relationMatch || !affirmativeRelation) {
    return replyText;
  }

  const bindingStopTerms = new Set([
    "inclui",
    "incluem",
    "incluir",
    "contem",
    "parte",
    "fazem",
    "possui",
    "voces",
    "empresa",
    "com",
    "para",
    "uma",
    "uns",
    "umas",
    "que",
    "isso",
    "esse",
    "essa",
    "estes",
    "estas",
  ]);

  const extractBindingTerms = (value: string) =>
    Array.from(
      new Set(
        value
          .split(/\s+/)
          .filter(
            (term) =>
              term.length >= 3 &&
              !bindingStopTerms.has(term),
          ),
      ),
    );

  const relationIndex = relationMatch.index;
  const relationEnd =
    relationIndex + relationMatch[0].length;

  const subjectTerms = extractBindingTerms(
    normalizedMessage.slice(0, relationIndex),
  );

  const objectTerms = extractBindingTerms(
    normalizedMessage.slice(relationEnd),
  );

  if (
    subjectTerms.length === 0 ||
    objectTerms.length === 0
  ) {
    return replyText;
  }

  const relevantKnowledge =
    authorizedContext
      .split(/\r?\n/)
      .map((line) =>
        normalizeFactualEvidenceText(line),
      )
      .filter(Boolean);

  const relationSupportedInSingleEvidence =
    relevantKnowledge.some((line) => {
      const lineTerms = new Set(line.split(/\s+/));

      const subjectSupported =
        subjectTerms.every((term) =>
          lineTerms.has(term),
        );

      const objectSupported =
        objectTerms.every((term) =>
          lineTerms.has(term),
        );

      return subjectSupported && objectSupported;
    });

  if (relationSupportedInSingleEvidence) {
    return replyText;
  }

  return "Essa relação não consta entre as informações disponíveis da empresa. Posso encaminhar sua dúvida ao Comercial?";
}
function enforceAuthorizedServiceAvailability(
  replyText: string,
  currentMessage: string,
  authorizedContext: string,
) {
  const requestedService = extractRequestedService(currentMessage);

  if (!requestedService) {
    return replyText;
  }

  const normalizedReply = normalizeFactualEvidenceText(replyText);
  const replyWithoutGreeting = normalizedReply
    .replace(/^ola\b(?:\s+cliente(?:\s+m1m\s+connect)?)?\s*/, "")
    .trim();
  const categoricalNegative =
    /^(?:(?:no momento|atualmente|por enquanto)\s+)?(?:nao\b|esse servico nao\b|essa informacao nao\b|o servico nao\b)/.test(
      replyWithoutGreeting,
    );

  if (!categoricalNegative) {
    return replyText;
  }

  if (
    hasExplicitNegativeServiceEvidence(
      authorizedContext,
      requestedService,
    )
  ) {
    return replyText;
  }

  return "Essa informação não consta entre as informações disponíveis da empresa. Posso encaminhar sua dúvida ao Comercial?";
}
function keepOnlyUnsupportedServiceAnswer(
  replyText: string,
  currentMessage: string,
) {
  const normalizedMessage =
    currentMessage
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const asksServiceAvailability =
    /\b(voces|a empresa|a loja)\s+(fazem|faz|oferecem|oferece|prestam|presta|trabalham com|trabalha com)\b/.test(
      normalizedMessage,
    );

  if (!asksServiceAvailability) {
    return replyText;
  }

  const normalizedReply =
    replyText
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const isNegativeServiceAnswer =
    /^(nao fazemos|nao oferecemos|nao prestamos|nao trabalhamos com|esse servico nao|essa informacao nao|o servico nao)/.test(
      normalizedReply,
    );

  if (!isNegativeServiceAnswer) {
    return replyText;
  }

  const firstSentenceMatch =
    replyText.match(/^.*?[.!](?:\s|$)/);

  return firstSentenceMatch
    ? firstSentenceMatch[0].trim()
    : replyText;
}

function applyDeterministicConversationGuard(
  replyText: string,
  userPrompt: string,
  handoffReason: AIProviderHumanHandoffReason | "NONE" = "NONE",
) {
  if (handoffReason === "HUMAN_ACTION_REQUIRED") {
    const currentMessage =
      extractCurrentCustomerMessage(userPrompt);
    const previousCustomerMessage =
      extractPreviousCustomerMessage(userPrompt);
    const greeting =
      extractNaturalGreeting(currentMessage) ??
      extractNaturalGreeting(previousCustomerMessage);
    const handoffMessage =
      "Entendi. Vou encaminhar seu pedido para a equipe respons\u00e1vel dar continuidade.";

    return greeting
      ? `${greeting} ${handoffMessage}`
      : handoffMessage;
  }

  const currentMessage = extractCurrentCustomerMessage(userPrompt);

  if (!currentMessage) {
    return replyText;
  }

  const pureCourtesy =
    isPureCourtesyWithoutNewRequest(currentMessage);
  const strongConfirmation =
    isStrongContextualConfirmationWithoutNewRequest(currentMessage);

  if (!pureCourtesy && !strongConfirmation) {
    return keepOnlyFirstRequestedInformation(
      keepOnlyUnsupportedServiceAnswer(
        replyText,
        currentMessage,
      ),
    );
  }

  if (pureCourtesy) {
    const withoutQuestions =
      stripQuestionsForResolvedStage(replyText);

    return withoutQuestions || "Por nada! Até mais!";
  }

  const withoutQuestions =
    stripQuestionsForResolvedStage(replyText);

  if (withoutQuestions) {
    return withoutQuestions;
  }

  return "Perfeito! Combinado.";
}
export const openAIProviderService = {
  async classifyMessageReadiness(input: {
    recentCustomerMessages: string[];
    currentMessage: string;
  }): Promise<{
    shouldWaitForContinuation: boolean;
    responseId: string;
    model: string;
  }> {
    const currentMessage = requireText(
      input.currentMessage,
      "Mensagem atual do cliente",
    );

    const recentCustomerMessages = input.recentCustomerMessages
      .map((message) => message.trim())
      .filter(Boolean)
      .slice(-6);

    const model =
      process.env.OPENAI_MODEL?.trim() ||
      "gpt-5-mini";

    const client = getClient();

    const response = await client.responses.create({
      model,
      instructions: [
        "Voce decide somente se uma mensagem de WhatsApp provavelmente e um fragmento que o cliente ainda esta completando.",
        "Retorne shouldWaitForContinuation=true apenas quando a mensagem atual, considerando as mensagens recentes do proprio CLIENTE, aparentar claramente ser uma continuacao incompleta e houver forte chance de outra mensagem completar a ideia.",
        "Retorne false para perguntas completas, pedidos completos, respostas objetivas, saudacoes, numeros/opcoes de menu, confirmacoes, negativas, agradecimentos e qualquer mensagem que ja possa ser respondida utilmente.",
        "Nao decida setor, nao responda ao cliente e nao invente contexto.",
      ].join("\n"),
      input: [
        recentCustomerMessages.length
          ? `MENSAGENS RECENTES DO CLIENTE:\n${recentCustomerMessages.join("\n")}`
          : "MENSAGENS RECENTES DO CLIENTE: nenhuma",
        "",
        "MENSAGEM ATUAL DO CLIENTE:",
        currentMessage,
      ].join("\n"),
      reasoning: {
        effort: "minimal",
      },
      max_output_tokens: 80,
      text: {
        format: {
          type: "json_schema",
          name: "m1m_message_readiness",
          strict: true,
          description:
            "Decisao sobre aguardar uma possivel continuacao da mensagem atual.",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              shouldWaitForContinuation: {
                type: "boolean",
                description:
                  "True somente quando a mensagem atual aparenta claramente ser um fragmento incompleto que provavelmente sera continuado.",
              },
            },
            required: [
              "shouldWaitForContinuation",
            ],
          },
        },
      },
    });

    const rawText = response.output_text?.trim();

    if (!rawText) {
      throw new Error(
        "A OpenAI nao retornou a decisao de continuidade da mensagem.",
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error(
        "A OpenAI retornou uma decisao de continuidade invalida.",
      );
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as Record<string, unknown>)
        .shouldWaitForContinuation !== "boolean"
    ) {
      throw new Error(
        "A OpenAI retornou uma decisao de continuidade invalida.",
      );
    }

    return {
      shouldWaitForContinuation:
        (parsed as Record<string, unknown>)
          .shouldWaitForContinuation as boolean,
      responseId: response.id,
      model: response.model,
    };
  },

  async classifyConversationIntent(input: {
    currentMessage: string;
    conversationHistory?: string | null;
    customerName?: string | null;
  }): Promise<{
    intent: "SOCIAL" | "CLOSING" | "OTHER";
    replyText: string | null;
    canHandleWithoutHistory: boolean;
    responseId: string;
    model: string;
  }> {
    const currentMessage = requireText(
      input.currentMessage,
      "Mensagem atual do cliente",
    );
    const conversationHistory =
      input.conversationHistory?.trim() || "";
    const customerName =
      input.customerName?.trim() || "";

    const model =
      process.env.OPENAI_MODEL?.trim() ||
      "gpt-5-mini";
    const client = getClient();

    const response = await client.responses.create({
      model,
      instructions: [
        "Classifique somente a intencao conversacional da mensagem atual de um cliente no WhatsApp.",
        "SOCIAL: saudacao, conversa social, cortesia, agradecimento ou resposta cordial que nao contenha um pedido comercial/operacional claro e que nao indique claramente encerramento.",
        "CLOSING: o cliente demonstra claramente que deseja encerrar ou pausar a conversa agora, inclusive quando agradece e indica que voltara/falara depois. Nao classifique mero agradecimento como CLOSING sem sinal contextual de encerramento.",
        "OTHER: qualquer pedido, pergunta, informacao comercial/operacional, selecao de setor, mensagem ambigua que possa conter uma necessidade, ou caso em que nao haja seguranca para SOCIAL/CLOSING.",
        "PRIORIDADE DE CONTEXTO: antes de classificar como SOCIAL ou CLOSING, verifique se a mensagem atual responde, confirma, aceita, recusa, escolhe ou complementa uma pergunta, proposta, alternativa ou acao pendente no turno imediatamente anterior do ATENDIMENTO. Nesses casos, classifique como OTHER para que o fluxo normal continue a conversa.",
        "Confirmacoes curtas como 'sim', 'sim, pode ser', 'pode', 'quero', 'prefiro', 'ok', 'certo', 'perfeito' ou equivalentes NAO sao SOCIAL apenas por serem cordiais. Se fizerem sentido como resposta ao que o ATENDIMENTO acabou de perguntar ou propor, classifique como OTHER.",
        "Classifique confirmacao como SOCIAL somente quando o historico mostrar que nao existe pergunta, escolha, proposta ou acao pendente e a mensagem funcionar apenas como reconhecimento cordial de algo ja resolvido.",
        "Para SOCIAL ou CLOSING, produza replyText curto, natural e humano em portugues brasileiro, adequado ao historico. No maximo duas frases e nenhuma pergunta. Escreva replyText sem emoji; o aplicativo acrescenta no maximo um emoji coerente com socialTone. O texto deve corresponder a intencao: SOCIAL reconhece a cortesia sem encerrar a conversa; CLOSING se despede.",
        "Escolha socialTone pelo significado da mensagem atual e pelo contexto: THANKS para agradecimento cordial; SOLIDARITY para parceria ou camaradagem; APPROVAL para reconhecimento positivo de algo resolvido; CELEBRATION para conquista ou satisfacao entusiasmada; FAREWELL somente para CLOSING; NONE para OTHER ou contexto neutro, delicado, negativo, cobranca, assunto financeiro ou suporte serio. Use NONE quando o emoji nao combinar. O tom nao muda a classificacao nem cria fatos. Mero agradecimento nao significa despedida.",
        "Para CLOSING, apenas se despeÃ§a cordialmente; nao venda, nao ofereca menu, nao qualifique e nao abra novo assunto.",
        "Para SOCIAL, responda somente a cortesia/socializacao sem inventar fatos da empresa, servicos, produtos, precos ou condicoes. Quando a mensagem for apenas agradecimento, confirmacao cordial ou interacao social ja resolvida, responda naturalmente e pare; nao acrescente oferta generica de ajuda, disponibilidade ou continuidade como 'se precisar', 'qualquer coisa', 'estou por aqui' ou 'e so chamar', salvo quando isso for realmente necessario pelo contexto.",
        "Use o nome do cliente somente se estiver disponivel e soar natural; nao pergunte o nome.",
        "Para OTHER, replyText deve ser string vazia.",
        "Defina canHandleWithoutHistory=true somente quando a mensagem SOCIAL puder ser respondida com seguranca mesmo sendo a primeira mensagem de um novo atendimento, sem depender de conversa anterior. Agradecimento, cortesia ou socializacao autocontida podem ser true. Saudacao de abertura isolada como 'oi', 'ola', 'bom dia', 'boa tarde' ou 'boa noite' deve ser false para preservar o fluxo inicial da empresa. Para OTHER, use false.",
        "Nao decida setor e nao invente contexto.",
      ].join("\n"),
      input: [
        customerName
          ? `NOME CONFIAVEL DO CLIENTE: ${customerName}`
          : "NOME CONFIAVEL DO CLIENTE: nao informado",
        conversationHistory
          ? `HISTORICO DO ATENDIMENTO:\n${conversationHistory}`
          : "HISTORICO DO ATENDIMENTO: nenhum",
        "",
        "MENSAGEM ATUAL DO CLIENTE:",
        currentMessage,
      ].join("\n"),
      reasoning: {
        effort: "minimal",
      },
      max_output_tokens: 160,
      text: {
        format: {
          type: "json_schema",
          name: "m1m_conversation_intent",
          strict: true,
          description:
            "Classificacao de cortesia social ou encerramento antes do fallback de setor.",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              intent: {
                type: "string",
                enum: ["SOCIAL", "CLOSING", "OTHER"],
              },
              replyText: {
                type: "string",
              },
              socialTone: {
                type: "string",
                enum: SOCIAL_TONES,
              },
              canHandleWithoutHistory: {
                type: "boolean",
              },
            },
            required: ["intent", "replyText", "socialTone", "canHandleWithoutHistory"],
          },
        },
      },
    });

    const rawText = response.output_text?.trim();
    if (!rawText) {
      throw new Error(
        "A OpenAI nao retornou a classificacao conversacional.",
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error(
        "A OpenAI retornou uma classificacao conversacional invalida.",
      );
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error(
        "A OpenAI retornou uma classificacao conversacional invalida.",
      );
    }

    const record =
      parsed as Record<string, unknown>;
    const intent = record.intent;
    const replyText = record.replyText;
    const socialTone = record.socialTone;
    const canHandleWithoutHistory =
      record.canHandleWithoutHistory;

    if (
      (intent !== "SOCIAL" &&
        intent !== "CLOSING" &&
        intent !== "OTHER") ||
      typeof replyText !== "string" ||
      typeof socialTone !== "string" ||
      !SOCIAL_TONES.includes(socialTone as SocialTone) ||
      typeof canHandleWithoutHistory !== "boolean"
    ) {
      throw new Error(
        "A OpenAI retornou uma classificacao conversacional invalida.",
      );
    }

    const normalizedReply =
      replyText.trim();

    if (
      intent !== "OTHER" &&
      !normalizedReply
    ) {
      throw new Error(
        "A OpenAI nao retornou resposta para a intencao conversacional.",
      );
    }

    return {
      intent,
      replyText:
        intent === "OTHER"
          ? null
          : composeSocialReply(normalizedReply, intent, socialTone as SocialTone, conversationHistory),
      canHandleWithoutHistory:
        intent === "SOCIAL"
          ? canHandleWithoutHistory
          : false,
      responseId: response.id,
      model: response.model,
    };
  },
  async generateResponse(
    input: AIProviderInput,
  ): Promise<AIProviderResult> {
    const systemPrompt =
      requireText(
        input.systemPrompt,
        "Prompt do sistema",
      );

    const userPrompt =
      requireText(
        input.userPrompt,
        "Mensagem do cliente",
      );

    const authorizedContext =
      requireText(
        input.authorizedContext,
        "Contexto factual autorizado",
      );

    const model =
      process.env.OPENAI_MODEL?.trim() ||
      "gpt-5-mini";

    const client = getClient();

    const response =
      await client.responses.create({
        model,
        instructions:
          systemPrompt,
        input:
          userPrompt,
        reasoning: {
          effort: "minimal",
        },
        max_output_tokens: 300,
        text: {
          format: {
            type: "json_schema",
            name:
              "m1m_customer_response",
            strict: true,
            description:
              "Resposta ao cliente e decisão operacional sobre necessidade de atendimento humano.",
            schema: {
              type: "object",
              additionalProperties:
                false,
              properties: {
                replyText: {
                  type: "string",
                  description:
                    "Texto natural, curto e pronto para ser enviado ao cliente no WhatsApp.",
                },
                needsHuman: {
                  type: "boolean",
                  description:
                    "True somente quando o atendimento precisa ser encaminhado para uma pessoa.",
                },
                handoffReason: {
                  type: "string",
                  enum: [
                    "NONE",
                    "CUSTOMER_REQUEST",
                    "INFORMATION_UNAVAILABLE",
                    "HUMAN_ACTION_REQUIRED",
                    "BUSINESS_RULE",
                    "OTHER",
                  ],
                  description:
                    "Motivo operacional da decisão. Use NONE quando needsHuman for false.",
                },
                subject: {
                  type: [
                    "string",
                    "null",
                  ],
                  description:
                    "Assunto principal do pedido do cliente quando houver handoff; caso contrário, null.",
                },
                context: {
                  type: [
                    "string",
                    "null",
                  ],
                  description:
                    "Resumo objetivo do que o atendente humano precisa saber quando houver handoff; caso contrário, null.",
                },
              },
              required: [
                "replyText",
                "needsHuman",
                "handoffReason",
                "subject",
                "context",
              ],
            },
          },
        },
      });

    const rawText =
      response.output_text?.trim();

    if (!rawText) {
      const incompleteReason =
        response.incomplete_details?.reason;

      throw new Error(
        incompleteReason
          ? `A OpenAI não retornou texto. Motivo: ${incompleteReason}.`
          : "A OpenAI não retornou uma resposta em texto.",
      );
    }

    const structuredResponse =
      parseStructuredResponse(
        rawText,
      );
    console.log("[TF10-KNOWLEDGE-DIAG]", {
      stage: "CANDIDATE",
      replyText: structuredResponse.replyText,
    });

    const tf8ReceiptInstructionMatch =
      authorizedContext.match(
        /(?:^|\n)(?:Comprovante|OrientaÃ§Ãµes sobre comprovante):\s*(.+)$/im,
      );
    const tf8ReceiptInstruction =
      tf8ReceiptInstructionMatch?.[1]?.trim() ?? "";
    const normalizeTf8DiagnosticText = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
    const tf8NormalizedReceiptInstruction =
      normalizeTf8DiagnosticText(tf8ReceiptInstruction);

    const tf8CandidateDiagnostics = {
      authorizedContextHasReceiptInstruction:
        tf8NormalizedReceiptInstruction.length > 0,
      candidatePreservesReceiptInstruction:
        tf8NormalizedReceiptInstruction.length > 0 &&
        normalizeTf8DiagnosticText(
          structuredResponse.replyText,
        ).includes(tf8NormalizedReceiptInstruction),
    };

    console.log(
      "[TF8-CANDIDATE-DIAG]",
      tf8CandidateDiagnostics,
    );

let effectiveStructuredResponse =
      structuredResponse;

    const operationalGuardResponse =
      await client.responses.create({
        model,
        instructions: [
          "Voce e uma salvaguarda operacional de atendimento via WhatsApp.",
          "Sua unica funcao e revisar a decisao anterior sobre encaminhar ou nao o atendimento para uma pessoa e impedir tanto handoffs indevidos quanto ausencia indevida de handoff.",
          "Use somente o contexto e as regras oficiais fornecidos. Nao crie regras, nao classifique setor e nao use conhecimento externo.",
          "Considere explicitamente a DECISAO OPERACIONAL ORIGINAL, mas nao a trate como correta apenas por ter sido produzida anteriormente.",
          "Escolha decision=NO_HANDOFF quando a IA puder continuar atendendo com seguranca usando o contexto autorizado ou quando faltar apenas um dado necessario que o proprio cliente possa legitimamente fornecer.",
          "Escolha decision=CUSTOMER_REQUEST somente quando o cliente tiver pedido explicitamente para falar, ser atendido ou ter continuidade com uma pessoa/equipe humana, OU quando a mensagem atual confirmar claramente uma oferta imediatamente anterior da IA para encaminhar/transferir o atendimento a uma pessoa/equipe humana. Um pedido comercial, duvida, interesse em produto/servico, pedido de informacao ou pedido de orcamento nao e, por si so, CUSTOMER_REQUEST.",
          "Escolha decision=INFORMATION_UNAVAILABLE somente quando TODAS estas condicoes forem atendidas: a intencao do cliente esta suficientemente clara; responder corretamente depende de um fato ou estado operacional necessario; esse fato ou estado nao esta positivamente sustentado pelas fontes autorizadas; nenhuma capacidade efetivamente disponibilizada neste fluxo permite consulta-lo; e a lacuna nao pode ser resolvida apenas perguntando ao proprio cliente um dado que ele possa legitimamente fornecer.",
          "Nao pressuponha acesso a sistemas, fontes, cadastros, estados internos ou ferramentas que nao tenham sido efetivamente disponibilizados no PROMPT DO SISTEMA / CONTEXTO AUTORIZADO. O fato de a empresa possivelmente possuir uma informacao nao significa que a IA consiga consulta-la.",
          "Escolha decision=HUMAN_ACTION_REQUIRED somente quando houver evidencia suficiente de que atender ao pedido exige uma acao ou execucao que a IA nao pode realizar diretamente e que depende da equipe humana.",
          "Escolha decision=BUSINESS_RULE somente quando uma regra oficial presente no PROMPT DO SISTEMA / CONTEXTO AUTORIZADO exigir explicitamente o encaminhamento humano para aquele caso.",
          "Escolha decision=OTHER somente quando houver necessidade real e comprovada de handoff que nao caiba nas categorias anteriores; nao use OTHER como escape para incerteza.",
          "Diferencie pedido de execucao de pergunta informativa. Informacao respondida pelas fontes autorizadas deve permanecer NO_HANDOFF.",
          "Nao promova handoff apenas por incerteza, por o pedido pertencer a determinado setor, por o cliente demonstrar interesse comercial, por solicitar orcamento ou por existir alguma informacao faltante.",
          "Se o dado faltante puder legitimamente ser fornecido pelo proprio cliente e for necessario para compreender ou prosseguir, preserve NO_HANDOFF para permitir uma unica pergunta necessaria.",
          "Se a intencao ja estiver clara e faltar um estado operacional interno nao consultavel, nao repita ao cliente a intencao ja compreendida apenas por nao possuir a resposta.",
          "Considere o historico apenas para compreender referencias, continuidade e informacoes que o cliente ja forneceu; o historico nao cria acesso a fatos operacionais internos.",
          "Quando decision for diferente de NO_HANDOFF, produza subject e context curtos e objetivos para continuidade humana. Registre somente o que o cliente quer e o que precisa ser verificado ou executado, sem transformar informacao desconhecida em fato.",
          "Retorne apenas o JSON exigido.",
        ].join("\n"),
        input: [
          "PROMPT DO SISTEMA / CONTEXTO AUTORIZADO:",
          systemPrompt,
          "",
          "MENSAGEM / CONTEXTO DO CLIENTE:",
          userPrompt,
          "",
          "DECISAO OPERACIONAL ORIGINAL:",
          JSON.stringify({
            needsHuman: structuredResponse.needsHuman,
            handoffReason: structuredResponse.handoffReason,
            subject: structuredResponse.subject,
            context: structuredResponse.context,
          }),
        ].join("\n"),
        reasoning: { effort: "minimal" },
        max_output_tokens: 180,
        text: {
          format: {
            type: "json_schema",
            name: "m1m_operational_handoff_guard",
            strict: true,
            description: "Salvaguarda simetrica para confirmar, corrigir ou impedir handoff operacional.",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                decision: {
                  type: "string",
                  enum: [
                    "NO_HANDOFF",
                    "CUSTOMER_REQUEST",
                    "INFORMATION_UNAVAILABLE",
                    "HUMAN_ACTION_REQUIRED",
                    "BUSINESS_RULE",
                    "OTHER",
                  ],
                  description: "Decisao operacional final da salvaguarda.",
                },
                subject: {
                  type: ["string", "null"],
                  description: "Assunto objetivo para continuidade humana quando decision nao for NO_HANDOFF; caso contrario, null.",
                },
                context: {
                  type: ["string", "null"],
                  description: "Resumo objetivo para continuidade humana quando decision nao for NO_HANDOFF; caso contrario, null.",
                },
              },
              required: ["decision", "subject", "context"],
            },
          },
        },
      });

    const operationalGuardRawText = operationalGuardResponse.output_text?.trim();
    if (!operationalGuardRawText) {
      throw new Error("A OpenAI nao retornou a salvaguarda operacional.");
    }

    let operationalGuardParsed: unknown;
    try {
      operationalGuardParsed = JSON.parse(operationalGuardRawText);
    } catch {
      throw new Error("A OpenAI retornou uma salvaguarda operacional invalida.");
    }
    if (!operationalGuardParsed || typeof operationalGuardParsed !== "object") {
      throw new Error("A OpenAI retornou uma salvaguarda operacional invalida.");
    }

    const operationalGuardRecord =
      operationalGuardParsed as Record<string, unknown>;
    const operationalDecision = operationalGuardRecord.decision;
    const allowedOperationalDecisions =
      new Set<string>([
        "NO_HANDOFF",
        "CUSTOMER_REQUEST",
        "INFORMATION_UNAVAILABLE",
        "HUMAN_ACTION_REQUIRED",
        "BUSINESS_RULE",
        "OTHER",
      ]);

    if (
      typeof operationalDecision !== "string" ||
      !allowedOperationalDecisions.has(operationalDecision)
    ) {
      throw new Error("A OpenAI retornou uma decisao operacional invalida.");
    }

    const operationalSubject =
      typeof operationalGuardRecord.subject === "string"
        ? operationalGuardRecord.subject.trim() || null
        : null;
    const operationalContext =
      typeof operationalGuardRecord.context === "string"
        ? operationalGuardRecord.context.trim() || null
        : null;

    if (
      operationalDecision === "NO_HANDOFF" &&
      (operationalSubject !== null || operationalContext !== null)
    ) {
      throw new Error(
        "A salvaguarda operacional retornou dados de handoff sem necessidade de atendimento humano.",
      );
    }

    const normalizedCandidateReply =
      normalizeBehaviorText(structuredResponse.replyText);

    const candidateAsksHandoffPermission =
      structuredResponse.replyText.includes("?") &&
      /\b(quer|deseja|posso|gostaria)\b/.test(normalizedCandidateReply) &&
      /\b(encaminh\w*|transfer\w*|cham\w*)\b/.test(
        normalizedCandidateReply,
      ) &&
      /\b(atendente|atendimento|equipe|pessoa|humano|humana|comercial|financeiro|criacao|suporte)\b/.test(
        normalizedCandidateReply,
      );

    const shouldKeepAIWhileAwaitingHandoffConfirmation =
      operationalDecision !== "NO_HANDOFF" &&
      candidateAsksHandoffPermission;

    if (
      operationalDecision === "NO_HANDOFF" ||
      shouldKeepAIWhileAwaitingHandoffConfirmation
    ) {
      effectiveStructuredResponse = {
        replyText: structuredResponse.replyText,
        needsHuman: false,
        handoffReason: "NONE",
        subject: null,
        context: null,
      };
    } else {
      effectiveStructuredResponse = {
        replyText: structuredResponse.replyText,
        needsHuman: true,
        handoffReason:
          operationalDecision as AIProviderHumanHandoffReason,
        subject: operationalSubject,
        context: operationalContext,
      };
    }

    const guardResponse =
      await client.responses.create({
        model,
        instructions: [
          "Voce e a camada final de seguranca factual e qualidade de uma resposta de atendimento via WhatsApp.",
          "Revise a RESPOSTA CANDIDATA usando SOMENTE fontes autorizadas. Para fatos sobre A EMPRESA (servicos, produtos, precos, prazos, pagamentos, politicas, enderecos, horarios, condicoes e disponibilidade), considere como fonte factual SOMENTE o FONTE FACTUAL AUTORIZADA. A mensagem atual e o historico servem para entender o pedido e a continuidade, mas nao autorizam fatos empresariais.",
          "Nao acrescente nem confirme servicos, produtos, precos, prazos, formas de pagamento, politicas, enderecos, horarios, condicoes ou qualquer outro fato empresarial que nao esteja positivamente sustentado pelo FONTE FACTUAL AUTORIZADA. Nao deduza um servico especifico a partir de categorias genericas, termos relacionados ou inferencias.",
          "Se o cliente perguntar se a empresa oferece ou possui algo que nao esteja positivamente sustentado pelo FONTE FACTUAL AUTORIZADA, nunca responda sim por inferencia. Diga de forma natural que essa informacao ou esse servico nao consta entre as informacoes disponiveis, sem inventar substitutos.",
          "Mensagens marcadas como CLIENTE podem informar fatos sobre o proprio cliente, sua necessidade, preferencia, objetivo ou decisao. Mensagens marcadas como ATENDIMENTO sao apenas memoria conversacional e NUNCA comprovam fatos sobre a empresa, mesmo que afirmem servicos, produtos, precos, condicoes ou outras informacoes empresariais.",
          "Preserve fatos empresariais sustentados pelo FONTE FACTUAL AUTORIZADA, inclusive dados estruturados como PIX, beneficiario, horarios e demais informacoes realmente cadastradas.",
          "A resposta deve responder primeiro ao ponto do cliente. Evite interrogatorio, rajada de perguntas e qualificacao desnecessaria.",
          "Use no maximo UMA pergunta na resposta final, e somente quando ela for indispensavel para cumprir o pedido atual. Se a pergunta do cliente ja puder ser respondida suficientemente, responda e pare: nao acrescente oferta de detalhamento, qualificacao, pergunta comercial ou convite generico para continuar.",
          "Nao transforme uma resposta adequada em menu, apresentacao institucional ou nova saudacao.",
          "Mantenha a intencao operacional da resposta candidata; revise somente o texto enviado ao cliente.",
          "Retorne apenas o JSON exigido.",
        ].join("\n"),
        input: [
          "FONTE FACTUAL AUTORIZADA:",
          authorizedContext,
          "",
          "MENSAGEM / CONTEXTO DO CLIENTE:",
          userPrompt,
          "",
          "REGRAS COMPORTAMENTAIS OBRIGATORIAS:",
          "Pedido atual explicito tem prioridade. Se houver novo pedido, responda-o mesmo que a mensagem tambem contenha agradecimento.",
          "Se a resposta ja puder resolver o pedido atual, responda e PARE; nao crie pergunta, oferta, qualificacao ou proximo passo desnecessario.",
          "Confirmacao contextual de pergunta/acao anterior deve ser reconhecida sem repetir a solicitacao. 'Sim' isolado diante de alternativas ou contexto ambiguo exige esclarecimento, nao escolha automatica.",
          "Agradecimento sem novo pedido deve terminar cordialmente e sem pergunta.",
          "Em conversa ja iniciada, nao se reapresente nem reinicie identidade, empresa ou menu.",
          "Use o historico recente CLIENTE/ATENDIMENTO para continuidade e para nao repetir pergunta ja respondida.",
          "",
          "RESPOSTA CANDIDATA:",
          structuredResponse.replyText,
        ].join("\n"),
        reasoning: {
          effort: "minimal",
        },
        max_output_tokens: 300,
        text: {
          format: {
            type: "json_schema",
            name: "m1m_response_guard",
            strict: true,
            description:
              "Revisao factual e comportamental da resposta antes do envio ao cliente.",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                replyText: {
                  type: "string",
                  description:
                    "Resposta final revisada, factualmente sustentada e com no maximo uma pergunta necessaria.",
                },
              },
              required: ["replyText"],
            },
          },
        },
      });

    const guardRawText =
      guardResponse.output_text?.trim();

    if (!guardRawText) {
      throw new Error(
        "A OpenAI nao retornou a revisao factual da resposta.",
      );
    }

    let guardParsed: unknown;

    try {
      guardParsed = JSON.parse(guardRawText);
    } catch {
      throw new Error(
        "A OpenAI retornou uma revisao factual invalida.",
      );
    }

    if (
      !guardParsed ||
      typeof guardParsed !== "object" ||
      typeof (guardParsed as Record<string, unknown>)
        .replyText !== "string"
    ) {
      throw new Error(
        "A OpenAI retornou uma revisao factual invalida.",
      );
    }

    const guardedReplyTextRaw = (
      guardParsed as Record<string, unknown>
    ).replyText;

    if (typeof guardedReplyTextRaw !== "string") {
      throw new Error(
        "A OpenAI retornou uma revisao factual invalida.",
      );
    }

    const normalizedGuardedReplyText =
      guardedReplyTextRaw.trim();
    console.log("[TF10-KNOWLEDGE-DIAG]", {
      stage: "FACTUAL_GUARD",
      replyText: normalizedGuardedReplyText,
    });

const internalMetadataLeakPattern =
      /(?:^|\b)(?:resposta\s+(?:adequada|inadequada)|needsHuman\s*:|handoffReason\s*:|subject\s*:|context\s*:)/i;

    const safeGuardedReplyText =
      internalMetadataLeakPattern.test(normalizedGuardedReplyText)
        ? "Não consigo confirmar essa informação com segurança pelas informações disponíveis."
        : normalizedGuardedReplyText;
let guardedReplyText = applyDeterministicConversationGuard(
      safeGuardedReplyText,
      userPrompt,
      effectiveStructuredResponse.needsHuman
        ? effectiveStructuredResponse.handoffReason
        : "NONE",
    );


    console.log("[TF10-KNOWLEDGE-DIAG]", {
      stage: "DETERMINISTIC_FINAL",
      replyText: guardedReplyText,
    });

    guardedReplyText =
      enforceAuthorizedServiceAvailability(
        guardedReplyText,
        extractCurrentCustomerMessage(userPrompt),
        authorizedContext,
      );

    guardedReplyText =
      enforceAuthorizedFactBinding(
        guardedReplyText,
        extractCurrentCustomerMessage(userPrompt),
        authorizedContext,
      );
    const normalizedFinalReply =
      normalizeBehaviorText(guardedReplyText);
const finalReplyAsksHandoffPermission =
      guardedReplyText.includes("?") &&
      /\b(quer|deseja|posso|gostaria)\b/.test(normalizedFinalReply) &&
      /\b(encaminh\w*|transfer\w*|cham\w*)\b/.test(
        normalizedFinalReply,
      ) &&
      /\b(atendente|atendimento|equipe|pessoa|humano|humana|comercial|financeiro|criacao|suporte|contato)\b/.test(
        normalizedFinalReply,
      );

    if (
      effectiveStructuredResponse.needsHuman &&
      finalReplyAsksHandoffPermission
    ) {
      effectiveStructuredResponse = {
        replyText: effectiveStructuredResponse.replyText,
        needsHuman: false,
        handoffReason: "NONE",
        subject: null,
        context: null,
      };
    }

    if (!guardedReplyText) {
      throw new Error(
        "A revisao factual retornou uma resposta vazia.",
      );
    }
    const usage: AIProviderUsage = {
      responseId:
        response.id,
      model:
        response.model,
      inputTokens:
        response.usage?.input_tokens ??
        null,
      outputTokens:
        response.usage?.output_tokens ??
        null,
      totalTokens:
        response.usage?.total_tokens ??
        null,
    };

    if (effectiveStructuredResponse.needsHuman) {
      return {
        ...usage,
        text:
          guardedReplyText,
        needsHuman: true,
        handoffReason:
          effectiveStructuredResponse.handoffReason,
        subject:
          effectiveStructuredResponse.subject,
        context:
          effectiveStructuredResponse.context,
      };
    }

    return {
      ...usage,
      text:
          guardedReplyText,
      needsHuman: false,
      handoffReason: "NONE",
      subject: null,
      context: null,
    };
  },
  async transcribeAudio(input: {
    buffer: Buffer;
    mimeType: string;
    durationSeconds?: number | null;
  }): Promise<{
    text: string;
    model: string;
  }> {
    if (
      !Buffer.isBuffer(input.buffer) ||
      input.buffer.length === 0
    ) {
      throw new Error(
        "O audio para transcricao esta vazio.",
      );
    }

    if (
      input.durationSeconds !== undefined &&
      input.durationSeconds !== null &&
      (
        !Number.isFinite(input.durationSeconds) ||
        input.durationSeconds <= 0
      )
    ) {
      throw new Error(
        "A duracao do audio para transcricao e invalida.",
      );
    }

    const normalizedMimeType =
      input.mimeType
        ?.split(";")[0]
        ?.trim()
        .toLowerCase();

    const extensionByMimeType: Record<string, string> = {
      "audio/flac": "flac",
      "audio/m4a": "m4a",
      "audio/mp4": "mp4",
      "audio/mpeg": "mp3",
      "audio/mpga": "mpga",
      "audio/ogg": "ogg",
      "audio/wav": "wav",
      "audio/webm": "webm",
    };

    const extension =
      normalizedMimeType
        ? extensionByMimeType[normalizedMimeType]
        : undefined;

    if (!normalizedMimeType || !extension) {
      throw new Error(
        "O formato do audio nao e suportado para transcricao.",
      );
    }

    const model =
      process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() ||
      "gpt-4o-mini-transcribe";

    const client = getClient();
    const file = await toFile(
      input.buffer,
      `audio.${extension}`,
      {
        type: normalizedMimeType,
      },
    );

    const response =
      await client.audio.transcriptions.create({
        file,
        model,
      });

    const text =
      response.text?.trim();

    if (!text) {
      throw new Error(
        "A OpenAI retornou uma transcricao vazia.",
      );
    }

    return {
      text,
      model,
    };
  },
};
