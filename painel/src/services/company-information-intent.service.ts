function normalizeIntentText(
  value: string,
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9\s]/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

const companyInformationPatterns = [
  /\bendereco\b/,
  /\bcep\b/,
  /\blocalizacao\b/,
  /\bonde (?:voces |a empresa |a loja )?(?:fica|ficam)\b/,
  /\bcomo chegar\b/,
  /\bhorario\b/,
  /\bhorarios\b/,
  /\bfuncionamento\b/,
  /\bque horas (?:abre|abrem|fecha|fecham)\b/,
  /\babre que horas\b/,
  /\bfecha que horas\b/,
  /\babre hoje\b/,
  /\bfecha hoje\b/,
  /\bfunciona hoje\b/,
  /\bpagamento\b/,
  /\bpagamentos\b/,
  /\bforma de pagar\b/,
  /\bformas de pagamento\b/,
  /\baceita pix\b/,
  /\baceitam pix\b/,
  /\bpix\b/,
  /\bcartao\b/,
  /\bboleto\b/,
  /\btransferencia\b/,
  /\bdinheiro\b/,
  /\btelefone\b/,
  /\bwhatsapp\b/,
  /\bemail\b/,
  /\be mail\b/,
  /\bsite\b/,
  /\binstagram\b/,
  /\bcontato\b/,
  /\bquem (?:sao|e) voces\b/,
  /\bo que (?:voces fazem|a empresa faz)\b/,
  /\bservicos\b/,
  /\bprodutos\b/,
  /\bdiferenciais\b/,
  /\barea de atendimento\b/,
  /\bpolitica da empresa\b/,
  /\bpoliticas da empresa\b/,
];

export const companyInformationIntentService = {
  isCompanyInformationQuestion(
    message: string,
  ) {
    const normalized =
      normalizeIntentText(
        message,
      );

    if (!normalized) {
      return false;
    }

    return companyInformationPatterns.some(
      (pattern) =>
        pattern.test(
          normalized,
        ),
    );
  },
};
