import type {
  CompanyInformationContext,
} from "@/services/company-context-builder.service";

function normalizeText(
  value: string | null | undefined,
) {
  return value?.trim() ?? "";
}

function buildCompanyLocation(
  context: CompanyInformationContext,
) {
  const parts = [
    normalizeText(
      context.company.address,
    ),
    normalizeText(
      context.company.city,
    ),
    normalizeText(
      context.company.state,
    ),
    normalizeText(
      context.company.zipCode,
    ),
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(", ")
    : "Não informado.";
}

function buildKnowledge(
  context: CompanyInformationContext,
) {
  const profile =
    context.knowledgeProfile;

  if (!profile) {
    return "Nenhuma informação complementar cadastrada.";
  }

  const lines = [
    ["Apresentação", profile.presentation],
    ["Diferenciais", profile.differentials],
    ["Produtos e serviços", profile.productsServices],
    ["Público-alvo", profile.targetAudience],
    ["Área de atendimento", profile.serviceArea],
    ["Políticas da empresa", profile.companyPolicies],
    ["Informações importantes", profile.importantInformation],
    ["Perguntas frequentes", profile.frequentlyAskedQuestions],
  ]
    .filter(
      ([, value]) =>
        normalizeText(
          value,
        ),
    )
    .map(
      ([label, value]) =>
        `${label}: ${normalizeText(value)}`,
    );

  return lines.length > 0
    ? lines.join("\n")
    : "Nenhuma informação complementar cadastrada.";
}

function buildSchedules(
  context: CompanyInformationContext,
) {
  const weekdayNames: Record<
    string,
    string
  > = {
    MONDAY: "Segunda-feira",
    TUESDAY: "Terça-feira",
    WEDNESDAY: "Quarta-feira",
    THURSDAY: "Quinta-feira",
    FRIDAY: "Sexta-feira",
    SATURDAY: "Sábado",
    SUNDAY: "Domingo",
  };

  const lines =
    context.schedules.map(
      (schedule) => {
        const day =
          weekdayNames[
            schedule.dayOfWeek
          ] ??
          schedule.dayOfWeek;

        if (!schedule.enabled) {
          return `${day}: fechado.`;
        }

        if (schedule.allDay) {
          return `${day}: aberto 24 horas.`;
        }

        const firstPeriod =
          schedule.openingTime &&
          schedule.closingTime
            ? `${schedule.openingTime} às ${schedule.closingTime}`
            : "horário não informado";

        const secondPeriod =
          schedule.secondOpeningTime &&
          schedule.secondClosingTime
            ? ` e ${schedule.secondOpeningTime} às ${schedule.secondClosingTime}`
            : "";

        return `${day}: ${firstPeriod}${secondPeriod}.`;
      },
    );

  return lines.length > 0
    ? lines.join("\n")
    : "Nenhum horário geral cadastrado.";
}

function buildPaymentSettings(
  context: CompanyInformationContext,
) {
  const settings =
    context.paymentSettings;

  if (!settings) {
    return "Nenhuma configuração de pagamento cadastrada.";
  }

  const accepted = [
    settings.acceptsPix
      ? "PIX"
      : null,
    settings.acceptsCash
      ? "Dinheiro"
      : null,
    settings.acceptsCreditCard
      ? "Cartão de crédito"
      : null,
    settings.acceptsDebitCard
      ? "Cartão de débito"
      : null,
    settings.acceptsBankSlip
      ? "Boleto"
      : null,
    settings.acceptsBankTransfer
      ? "Transferência bancária"
      : null,
  ].filter(Boolean);

  const lines = [
    `Formas aceitas: ${
      accepted.length > 0
        ? accepted.join(", ")
        : "Nenhuma forma marcada como aceita."
    }`,
    settings.acceptsPix &&
    settings.pixKey
      ? `PIX: tipo ${normalizeText(settings.pixKeyType) || "não informado"}; chave ${settings.pixKey}; favorecido ${normalizeText(settings.pixHolderName) || "não informado"}.`
      : null,
    settings.acceptsBankTransfer
      ? `Banco: ${normalizeText(settings.bankName) || "não informado"}; agência ${normalizeText(settings.bankAgency) || "não informada"}; conta ${normalizeText(settings.bankAccount) || "não informada"}; tipo ${normalizeText(settings.bankAccountType) || "não informado"}.`
      : null,
    settings.maxInstallments
      ? `Parcelamento máximo: ${settings.maxInstallments}x.`
      : null,
    settings.installmentInterest
      ? `Juros de parcelamento: ${settings.installmentInterest}.`
      : null,
    settings.paymentDeadline
      ? `Prazo de pagamento: ${settings.paymentDeadline}.`
      : null,
    settings.receiptInstructions
      ? `Comprovante: ${settings.receiptInstructions}`
      : null,
    settings.billingRules
      ? `Regras de cobrança: ${settings.billingRules}`
      : null,
    settings.additionalInformation
      ? `Informações adicionais: ${settings.additionalInformation}`
      : null,
  ].filter(Boolean);

  return lines.join("\n");
}

export const companyPromptBuilderService = {
  build(input: {
    context: CompanyInformationContext;
    customerMessage: string;
    customerName?: string | null;
    isConversationStart?: boolean;
  }) {
    const {
      company,
    } = input.context;

    const systemPrompt = [
      `Você é o atendimento oficial da ${company.name}.`,
      "Você está respondendo uma pergunta institucional da empresa, sem vincular o atendimento a um setor específico.",
      "",
      "REGRAS OBRIGATÓRIAS",
      input.isConversationStart
        ? `- Esta Ã© a primeira resposta deste atendimento. FaÃ§a uma saudaÃ§Ã£o breve e natural${normalizeText(input.customerName) ? ` usando o nome ${normalizeText(input.customerName)}` : ""}. NÃ£o transforme a abertura em apresentaÃ§Ã£o, menu ou questionÃ¡rio.`
        : "- Este atendimento jÃ¡ estÃ¡ em andamento. NÃ£o reinicie a conversa com apresentaÃ§Ã£o, saudaÃ§Ã£o de abertura ou menu.",
      "- Se o nome do cliente foi fornecido no contexto, use-o apenas quando soar natural e nÃ£o pergunte o nome novamente.",
      "- Responda apenas ao que o cliente perguntou.",
      "- Responda de forma natural, direta e objetiva, sem transformar a conversa em questionário, roteiro ou apresentação comercial.",
      "- Faça no máximo uma pergunta por resposta e somente quando ela for realmente necessária para responder ou avançar o pedido atual. Nunca agrupe duas ou mais perguntas, mesmo como alternativas.",
      "- Não repita informações que já foram ditas na conversa.",
      "- Não antecipe explicações, etapas, opções, ofertas ou próximos passos que o cliente não pediu. Depois de responder suficientemente ao pedido atual, pare.",
      "- Se o cliente pedir uma informação de pagamento, como chave PIX, responda somente com os dados configurados pertinentes ao que foi pedido; não pergunte se deseja receber os dados, pagar agora, receber orçamento ou seguir para outra etapa.",
      "- Não force gírias, emojis ou intimidade. Use emoji somente quando combinar naturalmente com a conversa e, em geral, no máximo um.",
      "- Use somente as informações fornecidas neste contexto.",
      "- Não invente endereço, CEP, localização, telefone, horário, pagamento, produto, serviço, política ou qualquer outro dado.",
      "- Se a informação pedida não estiver cadastrada, diga de forma objetiva que ela não está disponível no momento.",
      "- Não invente link de localização.",
      "- Não encaminhe para um setor apenas porque a pergunta é institucional.",
      "- Ao responder sobre o horário geral de atendimento, informe os períodos de funcionamento cadastrados e não cite espontaneamente dias fechados. Informe um dia fechado somente quando o cliente perguntar por esse dia ou por dias/períodos que incluam esse dia.",
      "- Para perguntas institucionais que possam ser respondidas com este contexto, use needsHuman = false.",
      "- Se a solicitação exigir efetivamente atendimento humano ou conhecimento setorial não disponível neste contexto, use needsHuman = true.",
      "- Quando needsHuman = true, não invente nome de setor; apenas informe de forma natural que precisa direcionar o atendimento.",
      "",
      "DADOS ESTRUTURADOS DA EMPRESA",
      `Nome: ${company.name}`,
      `Segmento: ${normalizeText(company.segment) || "Não informado."}`,
      `Apresentação: ${normalizeText(company.presentation) || "Não informada."}`,
      `Localização: ${buildCompanyLocation(input.context)}`,
      `Link da localização: ${normalizeText(company.locationLink) || "Não informado."}`,
      `Telefone: ${normalizeText(company.phone) || "Não informado."}`,
      `WhatsApp: ${normalizeText(company.whatsapp) || "Não informado."}`,
      `E-mail: ${normalizeText(company.email) || "Não informado."}`,
      `Site: ${normalizeText(company.website) || "Não informado."}`,
      `Instagram: ${normalizeText(company.instagram) || "Não informado."}`,
      "",
      "HORÁRIOS GERAIS DA EMPRESA",
      buildSchedules(
        input.context,
      ),
      "",
      "PAGAMENTO",
      buildPaymentSettings(
        input.context,
      ),
      "",
      "BASE DE CONHECIMENTO DA EMPRESA",
      buildKnowledge(
        input.context,
      ),
    ].join("\n");

    return {
      systemPrompt,
      userPrompt:
        input.customerMessage,
    };
  },
};
