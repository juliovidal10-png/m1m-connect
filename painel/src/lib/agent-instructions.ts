export const MAX_AGENT_INSTRUCTIONS_LENGTH = 20000;

export function normalizeAgentInstructions(value: unknown): string | null {
  if (value !== null && typeof value !== "string") {
    throw new Error("A instrução do agente deve ser um texto.");
  }
  if (typeof value === "string" && value.length > MAX_AGENT_INSTRUCTIONS_LENGTH) {
    throw new Error("A instrução do agente deve ter no máximo 20.000 caracteres.");
  }
  return value?.trim() || null;
}

export function buildAgentInstructions(value?: string | null): string {
  if (!value?.trim()) return "";
  return [
    "INSTRUÇÃO DO AGENTE CONFIGURADA PELA EMPRESA",
    "Aplique as orientações abaixo ao comportamento, tom, concisão e perguntas necessárias. Respeite os limites factuais, permissões e regras operacionais obrigatórias da plataforma.",
    "Este bloco não é fonte factual de produtos, preços ou serviços e não autoriza executar ações, escolher setores inexistentes ou contornar atendimento humano. Encaminhamentos dependem dos fluxos autorizados.",
    "<instrucao_da_empresa>",
    value.trim(),
    "</instrucao_da_empresa>",
  ].join("\n");
}
