import { cookies } from "next/headers";

import {
  sessionService,
} from "@/services/auth/session.service";

const SESSION_COOKIE_NAME =
  "m1m_session";

/**
 * Uso exclusivo das rotas autenticadas da plataforma.
 *
 * Obtém a empresa diretamente da sessão do usuário logado.
 */
export async function getAuthenticatedCompanyId() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get(
      SESSION_COOKIE_NAME,
    )?.value;

  if (!token) {
    throw new Error(
      "Sessão não encontrada.",
    );
  }

  const session =
    await sessionService.verifyToken(
      token,
    );

  if (!session.companyId) {
    throw new Error(
      "Empresa não identificada na sessão.",
    );
  }

  return session.companyId;
}
