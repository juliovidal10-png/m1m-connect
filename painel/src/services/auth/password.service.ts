import bcrypt from "bcryptjs";

const PASSWORD_SALT_ROUNDS = 12;

function requirePassword(
  value: string | null | undefined,
) {
  const password = value ?? "";

  if (password.length < 8) {
    throw new Error(
      "A senha deve ter pelo menos 8 caracteres.",
    );
  }

  return password;
}

export const passwordService = {
  async hashPassword(
    password: string,
  ) {
    const normalizedPassword =
      requirePassword(password);

    return bcrypt.hash(
      normalizedPassword,
      PASSWORD_SALT_ROUNDS,
    );
  },

  async verifyPassword(
    password: string,
    passwordHash: string,
  ) {
    if (!passwordHash?.trim()) {
      return false;
    }

    return bcrypt.compare(
      password,
      passwordHash,
    );
  },
};
