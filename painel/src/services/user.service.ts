import {
  userRepository,
  type UserData,
  type UserUpdateData,
} from "@/repositories/user.repository";

function requireText(
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

function requireEmail(
  value: string | null | undefined,
) {
  const normalizedEmail = requireText(
    value,
    "E-mail",
  ).toLowerCase();

  if (
    !normalizedEmail.includes("@") ||
    normalizedEmail.startsWith("@") ||
    normalizedEmail.endsWith("@")
  ) {
    throw new Error(
      "Informe um e-mail válido.",
    );
  }

  return normalizedEmail;
}

export const userService = {
  async listUsers(companyId: string) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    return userRepository.findAllByCompany(
      normalizedCompanyId,
    );
  },

  async createUser(
    companyId: string,
    input: Omit<
      UserData,
      "companyId"
    >,
  ) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    const name = requireText(
      input.name,
      "Nome",
    );

    const email = requireEmail(
      input.email,
    );

    const existingUser =
      await userRepository.findByEmail(
        email,
      );

    if (existingUser) {
      throw new Error(
        "Já existe um usuário cadastrado com este e-mail.",
      );
    }

    return userRepository.create({
      companyId: normalizedCompanyId,
      name,
      displayName:
        input.displayName,
      email,
      jobTitle:
        input.jobTitle,
      phone:
        input.phone,
      active:
        input.active ?? true,
    });
  },

  async updateUser(
    companyId: string,
    userId: string,
    input: UserUpdateData,
  ) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    const normalizedUserId =
      requireText(
        userId,
        "Usuário",
      );

    const existingUser =
      await userRepository.findById(
        normalizedCompanyId,
        normalizedUserId,
      );

    if (!existingUser) {
      throw new Error(
        "Usuário não encontrado.",
      );
    }

    const data: UserUpdateData = {
      ...input,
    };

    if (input.name !== undefined) {
      data.name = requireText(
        input.name,
        "Nome",
      );
    }

    if (input.email !== undefined) {
      const email = requireEmail(
        input.email,
      );

      const userWithEmail =
        await userRepository.findByEmail(
          email,
        );

      if (
        userWithEmail &&
        userWithEmail.id !==
          normalizedUserId
      ) {
        throw new Error(
          "Já existe outro usuário cadastrado com este e-mail.",
        );
      }

      data.email = email;
    }

    return userRepository.update(
      normalizedCompanyId,
      normalizedUserId,
      data,
    );
  },
};
