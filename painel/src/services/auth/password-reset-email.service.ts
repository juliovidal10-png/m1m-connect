import { Resend } from "resend";

function requireEnv(
  name: string,
) {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `A variável ${name} não está configurada.`,
    );
  }

  return value;
}

function escapeHtml(
  value: string,
) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const passwordResetEmailService = {
  async sendResetEmail(input: {
    email: string;
    resetUrl: string;
    expiresInMinutes: number;
  }) {
    const apiKey =
      requireEnv("RESEND_API_KEY");

    const from =
      requireEnv("RESEND_FROM_EMAIL");

    const resend =
      new Resend(apiKey);

    const safeUrl =
      escapeHtml(input.resetUrl);

    const {
      error,
    } = await resend.emails.send({
      from,
      to: input.email,
      subject:
        "Redefinição de senha — M1M Connect",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#171717;line-height:1.6">
          <h2 style="margin-bottom:16px">Redefinição de senha</h2>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta no M1M Connect.</p>
          <p style="margin:28px 0">
            <a
              href="${safeUrl}"
              style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700"
            >
              Redefinir minha senha
            </a>
          </p>
          <p>Este link é válido por ${input.expiresInMinutes} minutos e pode ser utilizado apenas uma vez.</p>
          <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
          <p style="margin-top:28px;color:#666;font-size:13px">M1M Connect</p>
        </div>
      `,
      text:
        `Redefinição de senha — M1M Connect\n\n` +
        `Acesse o link abaixo para criar uma nova senha:\n${input.resetUrl}\n\n` +
        `O link é válido por ${input.expiresInMinutes} minutos e pode ser usado apenas uma vez.\n\n` +
        `Se você não solicitou essa alteração, ignore este e-mail.`,
    });

    if (error) {
      throw new Error(
        error.message ||
          "Não foi possível enviar o e-mail de recuperação.",
      );
    }
  },
};
