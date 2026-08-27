import {
  createHash,
  randomBytes,
} from "node:crypto";

import {
  prisma,
} from "@/lib/prisma";

const DEFAULT_TOKEN_TTL_MINUTES = 60;

function requireValue(
  value: string | null | undefined,
  fieldName: string,
) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(
      `${fieldName} é obrigatório.`,
    );
  }

  return normalizedValue;
}

function hashToken(
  token: string,
) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export const accessTokenService = {
  async createToken(
    userIdValue: string,
    purposeValue: string,
    ttlMinutes = DEFAULT_TOKEN_TTL_MINUTES,
  ) {
    const userId = requireValue(
      userIdValue,
      "Usuário",
    );

    const purpose = requireValue(
      purposeValue,
      "Finalidade",
    );

    if (
      !Number.isFinite(ttlMinutes) ||
      ttlMinutes <= 0
    ) {
      throw new Error(
        "A validade do token deve ser maior que zero.",
      );
    }

    const user =
      await prisma.m1MUser.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          active: true,
        },
      });

    if (!user || !user.active) {
      throw new Error(
        "Usuário não encontrado ou inativo.",
      );
    }

    const now = new Date();

    await prisma.m1MAccessToken.updateMany({
      where: {
        userId,
        purpose,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        usedAt: now,
      },
    });

    const token =
      randomBytes(32).toString("hex");

    const tokenHash =
      hashToken(token);

    const expiresAt = new Date(
      now.getTime() +
        ttlMinutes * 60 * 1000,
    );

    await prisma.m1MAccessToken.create({
      data: {
        userId,
        tokenHash,
        purpose,
        expiresAt,
      },
    });

    return {
      token,
      expiresAt,
    };
  },

  async validateToken(
    tokenValue: string,
    purposeValue: string,
  ) {
    const token = requireValue(
      tokenValue,
      "Token",
    );

    const purpose = requireValue(
      purposeValue,
      "Finalidade",
    );

    const tokenHash =
      hashToken(token);

    const record =
      await prisma.m1MAccessToken.findUnique({
        where: {
          tokenHash,
        },
        include: {
          user: true,
        },
      });

    if (
      !record ||
      record.purpose !== purpose ||
      record.usedAt ||
      record.expiresAt <= new Date() ||
      !record.user.active
    ) {
      return null;
    }

    return record;
  },

  async consumeToken(
    tokenValue: string,
    purposeValue: string,
  ) {
    const record =
      await this.validateToken(
        tokenValue,
        purposeValue,
      );

    if (!record) {
      return null;
    }

    const now = new Date();

    const consumed =
      await prisma.m1MAccessToken.updateMany({
        where: {
          id: record.id,
          usedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          usedAt: now,
        },
      });

    if (consumed.count !== 1) {
      return null;
    }

    return {
      ...record,
      usedAt: now,
    };
  },
};