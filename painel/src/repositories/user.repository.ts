import { prisma } from "@/lib/prisma";

export type UserData = {
  companyId: string;
  name: string;
  displayName?: string | null;
  email: string;
  jobTitle?: string | null;
  phone?: string | null;
  active?: boolean;
};

export type UserUpdateData = {
  name?: string;
  displayName?: string | null;
  email?: string;
  jobTitle?: string | null;
  phone?: string | null;
  active?: boolean;
};

function normalizeOptionalText(
  value?: string | null,
) {
  const normalizedValue = value?.trim();

  return normalizedValue || null;
}

export const userRepository = {
  async findAllByCompany(companyId: string) {
    return prisma.m1MUser.findMany({
      where: {
        companyId,
      },
      orderBy: [
        {
          active: "desc",
        },
        {
          name: "asc",
        },
      ],
    });
  },

  async findById(
    companyId: string,
    userId: string,
  ) {
    return prisma.m1MUser.findFirst({
      where: {
        id: userId,
        companyId,
      },
    });
  },

  async findByEmail(email: string) {
    return prisma.m1MUser.findUnique({
      where: {
        email,
      },
    });
  },

  async create(data: UserData) {
    return prisma.m1MUser.create({
      data: {
        companyId: data.companyId,
        name: data.name.trim(),
        displayName:
          normalizeOptionalText(
            data.displayName,
          ),
        email: data.email.trim().toLowerCase(),
        jobTitle:
          normalizeOptionalText(
            data.jobTitle,
          ),
        phone:
          normalizeOptionalText(
            data.phone,
          ),
        active: data.active ?? true,
      },
    });
  },

  async update(
    companyId: string,
    userId: string,
    data: UserUpdateData,
  ) {
    const existingUser =
      await this.findById(
        companyId,
        userId,
      );

    if (!existingUser) {
      throw new Error(
        "Usuário não encontrado.",
      );
    }

    const updateData: UserUpdateData = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }

    if (data.displayName !== undefined) {
      updateData.displayName =
        normalizeOptionalText(
          data.displayName,
        );
    }

    if (data.email !== undefined) {
      updateData.email =
        data.email.trim().toLowerCase();
    }

    if (data.jobTitle !== undefined) {
      updateData.jobTitle =
        normalizeOptionalText(
          data.jobTitle,
        );
    }

    if (data.phone !== undefined) {
      updateData.phone =
        normalizeOptionalText(
          data.phone,
        );
    }

    if (data.active !== undefined) {
      updateData.active = data.active;
    }

    return prisma.m1MUser.update({
      where: {
        id: userId,
      },
      data: updateData,
    });
  },
};
