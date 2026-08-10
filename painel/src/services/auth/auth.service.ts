import {
  userRepository,
} from "@/repositories/user.repository";

import {
  passwordService,
} from "@/services/auth/password.service";

function requireEmail(
  value: string | null | undefined,
) {
  const email = value?.trim().toLowerCase();

  if (
    !email ||
    !email.includes("@") ||
    email.startsWith("@") ||
    email.endsWith("@")
  ) {
    throw new Error(
      "Informe um e-mail válido.",
    );
  }

  return email;
}

function requirePassword(
  value: string | null | undefined,
) {
  if (!value) {
    throw new Error(
      "Informe a senha.",
    );
  }

  return value;
}

export const authService = {
  async authenticate(
    emailValue: string,
    passwordValue: string,
  ) {
    const email =
      requireEmail(emailValue);

    const password =
      requirePassword(passwordValue);

    const user =
      await userRepository.findByEmail(
        email,
      );

    if (
      !user ||
      !user.active ||
      !user.passwordHash
    ) {
      throw new Error(
        "E-mail ou senha inválidos.",
      );
    }

    const passwordMatches =
      await passwordService.verifyPassword(
        password,
        user.passwordHash,
      );

    if (!passwordMatches) {
      throw new Error(
        "E-mail ou senha inválidos.",
      );
    }

    return {
      id: user.id,
      companyId: user.companyId,
      name: user.name,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      useCustomPermissions:
        user.useCustomPermissions,
      permissions: user.permissions,
      active: user.active,
    };
  },

  async definePassword(
    emailValue: string,
    passwordValue: string,
  ) {
    const email =
      requireEmail(emailValue);

    const user =
      await userRepository.findByEmail(
        email,
      );

    if (!user || !user.active) {
      throw new Error(
        "Usuário não encontrado ou inativo.",
      );
    }

    const passwordHash =
      await passwordService.hashPassword(
        passwordValue,
      );

    return userRepository.update(
      user.companyId,
      user.id,
      {
        passwordHash,
      },
    );
  },
};
