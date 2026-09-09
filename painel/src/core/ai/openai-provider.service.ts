import OpenAI from "openai";

export type AIProviderInput = {
  systemPrompt: string;
  userPrompt: string;
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
        "Para SOCIAL ou CLOSING, produza replyText curto, natural e humano em portugues brasileiro, adequado ao historico. No maximo duas frases e nenhuma pergunta.",
        "Para CLOSING, apenas se despeÃ§a cordialmente; nao venda, nao ofereca menu, nao qualifique e nao abra novo assunto.",
        "Para SOCIAL, responda somente a cortesia/socializacao sem inventar fatos da empresa, servicos, produtos, precos ou condicoes.",
        "Use o nome do cliente somente se estiver disponivel e soar natural; nao pergunte o nome.",
        "Para OTHER, replyText deve ser string vazia.",
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
      max_output_tokens: 120,
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
            },
            required: ["intent", "replyText"],
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

    if (
      (intent !== "SOCIAL" &&
        intent !== "CLOSING" &&
        intent !== "OTHER") ||
      typeof replyText !== "string"
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
          : normalizedReply,
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

    const guardResponse =
      await client.responses.create({
        model,
        instructions: [
          "Voce e a camada final de seguranca factual e qualidade de uma resposta de atendimento via WhatsApp.",
          "Revise a RESPOSTA CANDIDATA usando SOMENTE fontes autorizadas. Para fatos sobre A EMPRESA (servicos, produtos, precos, prazos, pagamentos, politicas, enderecos, horarios, condicoes e disponibilidade), considere como fonte factual SOMENTE o PROMPT DO SISTEMA / CONTEXTO AUTORIZADO. A mensagem atual e o historico servem para entender o pedido e a continuidade, mas nao autorizam fatos empresariais.",
          "Nao acrescente nem confirme servicos, produtos, precos, prazos, formas de pagamento, politicas, enderecos, horarios, condicoes ou qualquer outro fato empresarial que nao esteja positivamente sustentado pelo PROMPT DO SISTEMA / CONTEXTO AUTORIZADO. Nao deduza um servico especifico a partir de categorias genericas, termos relacionados ou inferencias.",
          "Se o cliente perguntar se a empresa oferece ou possui algo que nao esteja positivamente sustentado pelo PROMPT DO SISTEMA / CONTEXTO AUTORIZADO, nunca responda sim por inferencia. Diga de forma natural que essa informacao ou esse servico nao consta entre as informacoes disponiveis, sem inventar substitutos.",
          "Mensagens marcadas como CLIENTE podem informar fatos sobre o proprio cliente, sua necessidade, preferencia, objetivo ou decisao. Mensagens marcadas como ATENDIMENTO sao apenas memoria conversacional e NUNCA comprovam fatos sobre a empresa, mesmo que afirmem servicos, produtos, precos, condicoes ou outras informacoes empresariais.",
          "Preserve fatos empresariais sustentados pelo PROMPT DO SISTEMA / CONTEXTO AUTORIZADO, inclusive dados estruturados como PIX, beneficiario, horarios e demais informacoes realmente cadastradas.",
          "A resposta deve responder primeiro ao ponto do cliente. Evite interrogatorio, rajada de perguntas e qualificacao desnecessaria.",
          "Use no maximo UMA pergunta na resposta final, e somente quando ela for indispensavel para cumprir o pedido atual. Se a pergunta do cliente ja puder ser respondida suficientemente, responda e pare: nao acrescente oferta de detalhamento, qualificacao, pergunta comercial ou convite generico para continuar.",
          "Nao transforme uma resposta adequada em menu, apresentacao institucional ou nova saudacao.",
          "Mantenha a intencao operacional da resposta candidata; revise somente o texto enviado ao cliente.",
          "Retorne apenas o JSON exigido.",
        ].join("\n"),
        input: [
          "PROMPT DO SISTEMA / CONTEXTO AUTORIZADO:",
          systemPrompt,
          "",
          "MENSAGEM / CONTEXTO DO CLIENTE:",
          userPrompt,
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

    const guardedReplyText =
      guardedReplyTextRaw.trim();

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

    if (structuredResponse.needsHuman) {
      return {
        ...usage,
        text:
          guardedReplyText,
        needsHuman: true,
        handoffReason:
          structuredResponse.handoffReason,
        subject:
          structuredResponse.subject,
        context:
          structuredResponse.context,
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
};
