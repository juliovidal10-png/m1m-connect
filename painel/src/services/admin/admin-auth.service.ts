import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import type {
  NextRequest,
} from "next/server";

export const M1M_ADMIN_SESSION_COOKIE =
  "m1m_admin_session";

const SESSION_PAYLOAD =
  "m1m-admin-session-v1";

function getConfiguredAdminKey() {
  return (
    process.env.M1M_ADMIN_KEY?.trim() ||
    ""
  );
}

function createSessionToken(
  adminKey: string,
) {
  return createHmac(
    "sha256",
    adminKey,
  )
    .update(
      SESSION_PAYLOAD,
    )
    .digest(
      "hex",
    );
}

function safeEqual(
  left: string,
  right: string,
) {
  const leftBuffer =
    Buffer.from(
      left,
      "utf8",
    );

  const rightBuffer =
    Buffer.from(
      right,
      "utf8",
    );

  if (
    leftBuffer.length !==
    rightBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    leftBuffer,
    rightBuffer,
  );
}

export const adminAuthService = {
  isConfigured() {
    return (
      getConfiguredAdminKey().length >
      0
    );
  },

  validateAdminKey(
    providedKey:
      | string
      | null
      | undefined,
  ) {
    const configuredKey =
      getConfiguredAdminKey();

    const normalizedProvidedKey =
      providedKey?.trim() || "";

    if (
      !configuredKey ||
      !normalizedProvidedKey
    ) {
      return false;
    }

    return safeEqual(
      normalizedProvidedKey,
      configuredKey,
    );
  },

  getSessionToken() {
    const configuredKey =
      getConfiguredAdminKey();

    if (!configuredKey) {
      throw new Error(
        "M1M_ADMIN_KEY não está configurada.",
      );
    }

    return createSessionToken(
      configuredKey,
    );
  },

  validateSessionToken(
    token:
      | string
      | null
      | undefined,
  ) {
    const configuredKey =
      getConfiguredAdminKey();

    const normalizedToken =
      token?.trim() || "";

    if (
      !configuredKey ||
      !normalizedToken
    ) {
      return false;
    }

    const expectedToken =
      createSessionToken(
        configuredKey,
      );

    return safeEqual(
      normalizedToken,
      expectedToken,
    );
  },

  isAuthorizedRequest(
    request: NextRequest,
  ) {
    const sessionToken =
      request.cookies.get(
        M1M_ADMIN_SESSION_COOKIE,
      )?.value;

    if (
      this.validateSessionToken(
        sessionToken,
      )
    ) {
      return true;
    }

    const headerKey =
      request.headers
        .get(
          "x-m1m-admin-key",
        )
        ?.trim();

    return this.validateAdminKey(
      headerKey,
    );
  },
};
