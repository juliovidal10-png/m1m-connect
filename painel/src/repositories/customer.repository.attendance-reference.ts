import { prisma } from "@/lib/prisma";

export type CustomerData = {
  companyId: string;
  remoteJid: string;
  name?: string | null;
  phone?: string | null;
  company?: string | null;
  city?: string | null;
  responsible?: string | null;
  observations?: string | null;
  status?: string | null;
};

function normalizeOptionalText(
  value?: string | null,
) {
  const normalizedValue = value?.trim();

  return normalizedValue || null;
}

export const customerRepository = {
  async findByRemoteJid(
    companyId: string,
    remoteJid: string,
  ) {
    return prisma.m1MCustomer.findFirst({
      where: {
        companyId,
        remoteJid,
      },
    });
  },

  async create(data: CustomerData) {
    return prisma.m1MCustomer.create({
      data: {
        companyId: data.companyId,
        remoteJid: data.remoteJid.trim(),
        name: normalizeOptionalText(data.name),
        phone: normalizeOptionalText(data.phone),
        company: normalizeOptionalText(data.company),
        city: normalizeOptionalText(data.city),
        responsible: normalizeOptionalText(
          data.responsible,
        ),
        observations: normalizeOptionalText(
          data.observations,
        ),
        status:
          normalizeOptionalText(data.status) || "IA",
      },
    });
  },

  async update(
    id: string,
    data: Omit<
      CustomerData,
      "companyId" | "remoteJid"
    >,
  ) {
    return prisma.m1MCustomer.update({
      where: {
        id,
      },
      data: {
        name: normalizeOptionalText(data.name),
        phone: normalizeOptionalText(data.phone),
        company: normalizeOptionalText(data.company),
        city: normalizeOptionalText(data.city),
        responsible: normalizeOptionalText(
          data.responsible,
        ),
        observations: normalizeOptionalText(
          data.observations,
        ),
        status:
          normalizeOptionalText(data.status) || "IA",
      },
    });
  },

  async assignResponsible(
    customerId: string,
    responsibleId: string,
  ) {
    const customer =
      await prisma.m1MCustomer.findUnique({
        where: {
          id: customerId,
        },
      });

    if (!customer) {
      throw new Error("Cliente não encontrado.");
    }

    const user = await prisma.m1MUser.findFirst({
      where: {
        id: responsibleId,
        companyId: customer.companyId,
        active: true,
      },
    });

    if (!user) {
      throw new Error(
        "Responsável não encontrado ou inativo.",
      );
    }

    const responsibleName =
      normalizeOptionalText(user.displayName) ||
      normalizeOptionalText(user.name) ||
      user.id;

    return prisma.m1MCustomer.update({
      where: {
        id: customerId,
      },
      data: {
        responsible: responsibleName,
        responsibleId: user.id,
        status: "HUMANO",
        assignedAt: new Date(),
        releasedAt: null,
      },
    });
  },

  async upsert(data: CustomerData) {
    const existingCustomer =
      await this.findByRemoteJid(
        data.companyId,
        data.remoteJid,
      );

    if (!existingCustomer) {
      return this.create(data);
    }

    return this.update(existingCustomer.id, {
      name: data.name,
      phone: data.phone,
      company: data.company,
      city: data.city,
      responsible: data.responsible,
      observations: data.observations,
      status: data.status,
    });
  },
};