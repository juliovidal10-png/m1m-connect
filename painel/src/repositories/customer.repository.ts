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

export type ListCustomersFilters = {
  search?: string | null;
  status?: string | null;
  responsibleId?: string | null;
};

type CustomerUpdateData = Omit<
  CustomerData,
  "companyId" | "remoteJid"
>;

function normalizeOptionalText(
  value?: string | null,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue || null;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isUsefulName(
  value?: string | null,
) {
  const normalizedValue =
    normalizeOptionalText(value);

  if (!normalizedValue) {
    return false;
  }

  const letters =
    normalizedValue.match(
      /\p{L}/gu,
    ) ?? [];

  if (letters.length < 2) {
    return false;
  }

  const compactValue =
    normalizedValue.replace(
      /\s/g,
      "",
    );

  const digits =
    normalizedValue.replace(
      /\D/g,
      "",
    );

  const isMostlyNumeric =
    digits.length >= 8 &&
    digits.length >=
      compactValue.length * 0.65;

  return !isMostlyNumeric;
}

function normalizeCustomerName(
  value: string | null | undefined,
  remoteJid: string,
) {
  const normalizedValue =
    normalizeOptionalText(value);

  if (
    remoteJid.endsWith("@g.us")
  ) {
    return normalizedValue;
  }

  return isUsefulName(
    normalizedValue,
  )
    ? normalizedValue
    : null;
}

function chooseCustomerName(
  existingName: string | null,
  incomingName:
    | string
    | null
    | undefined,
  remoteJid: string,
) {
  const normalizedExistingName =
    normalizeCustomerName(
      existingName,
      remoteJid,
    );

  const normalizedIncomingName =
    normalizeCustomerName(
      incomingName,
      remoteJid,
    );

  if (normalizedIncomingName) {
    return normalizedIncomingName;
  }

  return normalizedExistingName;
}

function getPushName(
  rawPayload: unknown,
) {
  if (!isRecord(rawPayload)) {
    return null;
  }

  return typeof rawPayload.pushName ===
    "string"
    ? normalizeOptionalText(
        rawPayload.pushName,
      )
    : null;
}

function isOfficialWhatsAppJid(
  remoteJid: string,
) {
  return remoteJid.endsWith(
    "@s.whatsapp.net",
  );
}

function extractIdentifier(
  remoteJid: string,
) {
  return (
    remoteJid
      .split("@")[0]
      ?.replace(/\D/g, "") || ""
  );
}

function formatBrazilianPhone(
  value?: string | null,
) {
  const digits =
    value?.replace(/\D/g, "") ||
    "";

  const normalizedDigits =
    digits.startsWith("55") &&
    digits.length >= 12
      ? digits.slice(2)
      : digits;

  if (normalizedDigits.length === 11) {
    return `(${normalizedDigits.slice(
      0,
      2,
    )}) ${normalizedDigits.slice(
      2,
      7,
    )}-${normalizedDigits.slice(7)}`;
  }

  if (normalizedDigits.length === 10) {
    return `(${normalizedDigits.slice(
      0,
      2,
    )}) ${normalizedDigits.slice(
      2,
      6,
    )}-${normalizedDigits.slice(6)}`;
  }

  return value?.trim() || null;
}

function getAlternativeRemoteJid(
  rawPayload: unknown,
) {
  if (!isRecord(rawPayload)) {
    return null;
  }

  const key = isRecord(
    rawPayload.key,
  )
    ? rawPayload.key
    : null;

  if (
    key &&
    typeof key.remoteJidAlt ===
      "string"
  ) {
    return normalizeOptionalText(
      key.remoteJidAlt,
    );
  }

  return null;
}

function buildDisplayData(customer: {
  name: string | null;
  phone: string | null;
  remoteJid: string;
  messages: Array<{
    content: string | null;
    rawPayload: unknown;
    sentAt: Date;
  }>;
}) {
  const latestMessage =
    customer.messages[0] || null;

  const pushName =
    getPushName(
      latestMessage?.rawPayload,
    );

  const alternativeRemoteJid =
    getAlternativeRemoteJid(
      latestMessage?.rawPayload,
    );

  const isGroup =
    customer.remoteJid.endsWith(
      "@g.us",
    );

  const isLid =
    customer.remoteJid.endsWith(
      "@lid",
    );

  const remoteIdentifier =
    extractIdentifier(
      customer.remoteJid,
    );

  const alternativeIdentifier =
    alternativeRemoteJid
      ? extractIdentifier(
          alternativeRemoteJid,
        )
      : "";

  const phoneSource =
    normalizeOptionalText(
      customer.phone,
    ) ||
    (!isGroup &&
    alternativeIdentifier
      ? alternativeIdentifier
      : null) ||
    (!isGroup && !isLid
      ? remoteIdentifier
      : null);

  const displayPhone =
    formatBrazilianPhone(
      phoneSource,
    );

  const trustedSavedName =
    isUsefulName(customer.name)
      ? normalizeOptionalText(
          customer.name,
        )
      : null;

  const displayName =
    isGroup
      ? (
          trustedSavedName ||
          (remoteIdentifier
            ? `Grupo WhatsApp ${remoteIdentifier}`
            : "Grupo do WhatsApp")
        )
      : (
          trustedSavedName ||
          displayPhone ||
          "Cliente sem identificaÃ§Ã£o"
        );

  const suggestedName =
    !trustedSavedName &&
    isUsefulName(pushName)
      ? pushName
      : null;

  return {
    displayName,
    displayPhone,
    suggestedName,
    isGroup,
    isLid,
    alternativeRemoteJid,
    lastMessageAt:
      latestMessage?.sentAt ??
      null,
    lastMessagePreview:
      normalizeOptionalText(
        latestMessage?.content,
      ),
  };
}

function buildUpdateData(
  data: CustomerUpdateData,
) {
  const updateData: {
    name?: string | null;
    phone?: string | null;
    company?: string | null;
    city?: string | null;
    responsible?: string | null;
    observations?: string | null;
    status?: string;
  } = {};

  if (data.name !== undefined) {
    updateData.name =
      normalizeOptionalText(
        data.name,
      );
  }

  if (data.phone !== undefined) {
    updateData.phone =
      normalizeOptionalText(
        data.phone,
      );
  }

  if (data.company !== undefined) {
    updateData.company =
      normalizeOptionalText(
        data.company,
      );
  }

  if (data.city !== undefined) {
    updateData.city =
      normalizeOptionalText(
        data.city,
      );
  }

  if (
    data.responsible !==
    undefined
  ) {
    updateData.responsible =
      normalizeOptionalText(
        data.responsible,
      );
  }

  if (
    data.observations !==
    undefined
  ) {
    updateData.observations =
      normalizeOptionalText(
        data.observations,
      );
  }

  if (data.status !== undefined) {
    updateData.status =
      normalizeOptionalText(
        data.status,
      ) || "IA";
  }

  return updateData;
}

function getPrismaErrorCode(
  error: unknown,
) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return null;
  }

  return typeof error.code ===
    "string"
    ? error.code
    : null;
}

async function createCustomerWithCode(
  data: CustomerData,
) {
  const maximumAttempts = 3;

  for (
    let attempt = 1;
    attempt <= maximumAttempts;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const lastCustomer =
            await transaction.m1MCustomer.findFirst({
              where: {
                companyId:
                  data.companyId,
                customerCode: {
                  not: null,
                },
              },
              select: {
                customerCode: true,
              },
              orderBy: {
                customerCode: "desc",
              },
            });

          const nextCustomerCode =
            (lastCustomer?.customerCode ??
              0) + 1;

          return transaction.m1MCustomer.create({
            data: {
              companyId:
                data.companyId,
              customerCode:
                nextCustomerCode,
              remoteJid:
                data.remoteJid.trim(),
              name:
                normalizeCustomerName(
                  data.name,
                  data.remoteJid,
                ),
              phone:
                normalizeOptionalText(
                  data.phone,
                ),
              company:
                normalizeOptionalText(
                  data.company,
                ),
              city:
                normalizeOptionalText(
                  data.city,
                ),
              responsible:
                normalizeOptionalText(
                  data.responsible,
                ),
              observations:
                normalizeOptionalText(
                  data.observations,
                ),
              status:
                normalizeOptionalText(
                  data.status,
                ) || "IA",
            },
          });
        },
        {
          isolationLevel:
            "Serializable",
        },
      );
    } catch (error) {
      const errorCode =
        getPrismaErrorCode(error);

      const mayRetry =
        errorCode === "P2002" ||
        errorCode === "P2034";

      if (
        mayRetry &&
        attempt < maximumAttempts
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "NÃ£o foi possÃvel gerar o CÃ³digo M1M do cliente.",
  );
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

  async findByPhone(
    companyId: string,
    phone: string,
  ) {
    return prisma.m1MCustomer.findFirst({
      where: {
        companyId,
        phone,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  },

  async listByCompany(
    companyId: string,
    filters: ListCustomersFilters = {},
  ) {
    const search =
      normalizeOptionalText(
        filters.search,
      );

    const status =
      normalizeOptionalText(
        filters.status,
      )?.toUpperCase();

    const responsibleId =
      normalizeOptionalText(
        filters.responsibleId,
      );

    const customers =
      await prisma.m1MCustomer.findMany({
        where: {
          companyId,
          ...(status &&
          status !== "TODOS"
            ? {
                status,
              }
            : {}),
          ...(responsibleId
            ? {
                responsibleId,
              }
            : {}),
        },
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              displayName: true,
              active: true,
            },
          },
          attendances: {
            select: {
              id: true,
              number: true,
              state: true,
              startedAt: true,
              finishedAt: true,
              updatedAt: true,
              responsible: {
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                },
              },
              sector: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              startedAt: "desc",
            },
            take: 1,
          },
          messages: {
            select: {
              content: true,
              rawPayload: true,
              sentAt: true,
            },
            orderBy: {
              sentAt: "desc",
            },
            take: 1,
          },
          _count: {
            select: {
              attendances: true,
              messages: true,
              reminders: true,
              paymentReceipts: true,
            },
          },
        },
        orderBy: [
          {
            updatedAt: "desc",
          },
          {
            name: "asc",
          },
        ],
      });

    const presentedCustomers =
      customers.map((customer) => {
        const displayData =
          buildDisplayData(
            customer,
          );

        const {
          messages: _messages,
          ...customerData
        } = customer;

        return {
          ...customerData,
          ...displayData,
        };
      });

    if (!search) {
      return presentedCustomers;
    }

    const normalizedSearch =
      search.toLocaleLowerCase(
        "pt-BR",
      );

    return presentedCustomers.filter(
      (customer) => {
        const searchableValues = [
          customer.displayName,
          customer.displayPhone,
          customer.name,
          customer.phone,
          customer.company,
          customer.city,
          customer.remoteJid,
          customer.customerCode
            ?.toString(),
          customer.customerCode
            ?.toString()
            .padStart(6, "0"),
          customer.responsible,
          customer.assignedUser
            ?.displayName,
          customer.assignedUser?.name,
          customer.attendances[0]
            ?.sector?.name,
        ];

        return searchableValues.some(
          (value) =>
            value
              ?.toLocaleLowerCase(
                "pt-BR",
              )
              .includes(
                normalizedSearch,
              ),
        );
      },
    );
  },

  async create(
    data: CustomerData,
  ) {
    return createCustomerWithCode(
      data,
    );
  },

  async update(
    id: string,
    data: CustomerUpdateData,
  ) {
    return prisma.m1MCustomer.update({
      where: {
        id,
      },
      data:
        buildUpdateData(
          data,
        ),
    });
  },

  async markAsHuman(
    companyId: string,
    customerId: string,
  ) {
    const customer =
      await prisma.m1MCustomer.findFirst({
        where: {
          id: customerId,
          companyId,
        },
      });

    if (!customer) {
      throw new Error(
        "Cliente não encontrado.",
      );
    }

    return prisma.m1MCustomer.update({
      where: {
        id: customer.id,
      },
      data: {
        status: "HUMANO",
        assignedAt: new Date(),
        releasedAt: null,
      },
    });
  },

  async assignResponsible(
    companyId: string,
    customerId: string,
    responsibleId: string,
  ) {
    const customer =
      await prisma.m1MCustomer.findFirst({
        where: {
          id: customerId,
          companyId,
        },
      });

    if (!customer) {
      throw new Error(
        "Cliente nÃ£o encontrado.",
      );
    }

    const user =
      await prisma.m1MUser.findFirst({
        where: {
          id: responsibleId,
          companyId,
          active: true,
        },
      });

    if (!user) {
      throw new Error(
        "ResponsÃ¡vel nÃ£o encontrado ou inativo.",
      );
    }

    const responsibleName =
      normalizeOptionalText(
        user.displayName,
      ) ||
      normalizeOptionalText(
        user.name,
      ) ||
      user.id;

    return prisma.m1MCustomer.update({
      where: {
        id: customer.id,
      },
      data: {
        responsible:
          responsibleName,
        responsibleId:
          user.id,
        status: "HUMANO",
        assignedAt: new Date(),
        releasedAt: null,
      },
    });
  },

  async upsert(
    data: CustomerData,
  ) {
    const normalizedRemoteJid =
      data.remoteJid.trim();

    const normalizedPhone =
      normalizeOptionalText(
        data.phone,
      );

    const customerByRemoteJid =
      await this.findByRemoteJid(
        data.companyId,
        normalizedRemoteJid,
      );

    const existingCustomer =
      customerByRemoteJid ??
      (
        normalizedPhone
          ? await this.findByPhone(
              data.companyId,
              normalizedPhone,
            )
          : null
      );

    if (!existingCustomer) {
      return this.create({
        ...data,
        remoteJid:
          normalizedRemoteJid,
        phone:
          normalizedPhone,
      });
    }

    const shouldPromoteRemoteJid =
      isOfficialWhatsAppJid(
        normalizedRemoteJid,
      ) &&
      !isOfficialWhatsAppJid(
        existingCustomer.remoteJid,
      );

    const updateData =
      buildUpdateData({
        name:
          chooseCustomerName(
            existingCustomer.name,
            data.name,
            shouldPromoteRemoteJid
              ? normalizedRemoteJid
              : existingCustomer.remoteJid,
          ),
        phone:
          normalizedPhone ??
          existingCustomer.phone,
        company: data.company,
        city: data.city,
        responsible:
          data.responsible,
        observations:
          data.observations,
        status: data.status,
      });

    return prisma.m1MCustomer.update({
      where: {
        id: existingCustomer.id,
      },
      data: {
        ...updateData,
        ...(shouldPromoteRemoteJid
          ? {
              remoteJid:
                normalizedRemoteJid,
            }
          : {}),
      },
    });
  },
};
