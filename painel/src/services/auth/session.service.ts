import {
  SignJWT,
  jwtVerify,
} from "jose";

export type SessionPayload = {
  userId: string;
  companyId: string;
  email: string;
  role: string;
};

const SESSION_DURATION_SECONDS =
  60 * 60 * 24 * 7;

function getSessionSecret() {
  const secret =
    process.env.M1M_SESSION_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "A variável M1M_SESSION_SECRET não está configurada.",
    );
  }

  return new TextEncoder().encode(secret);
}

export const sessionService = {
  async createToken(
    payload: SessionPayload,
  ) {
    return new SignJWT({
      companyId: payload.companyId,
      email: payload.email,
      role: payload.role,
    })
      .setProtectedHeader({
        alg: "HS256",
      })
      .setSubject(payload.userId)
      .setIssuedAt()
      .setExpirationTime(
        `${SESSION_DURATION_SECONDS}s`,
      )
      .sign(getSessionSecret());
  },

  async verifyToken(
    token: string,
  ): Promise<SessionPayload> {
    const {
      payload,
    } = await jwtVerify(
      token,
      getSessionSecret(),
    );

    if (
      !payload.sub ||
      typeof payload.companyId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string"
    ) {
      throw new Error(
        "Sessão inválida.",
      );
    }

    return {
      userId: payload.sub,
      companyId: payload.companyId,
      email: payload.email,
      role: payload.role,
    };
  },
};
