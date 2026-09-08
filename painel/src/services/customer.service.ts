import {
  customerRepository,
  type CustomerData,
} from "@/repositories/customer.repository";

export type SaveCustomerInput = {
  companyId: string;
  remoteJid: string;
  name?: string | null;
  customerCode?: number | null;
  nameManuallySet?: boolean;
  phone?: string | null;
  company?: string | null;
  city?: string | null;
  responsible?: string | null;
  responsibleId?: string | null;
  observations?: string | null;
  status?: string | null;
};

export type AssignResponsibleInput = {
  companyId: string;
  customerId: string;
  responsibleId: string;
};

export type ListCustomersInput = {
  companyId: string;
  search?: string | null;
  status?: string | null;
  responsibleId?: string | null;
};

function requireText(
  value: string | null | undefined,
  fieldName: string,
) {
  const normalizedValue =
    value?.trim();

  if (!normalizedValue) {
    throw new Error(
      `${fieldName} é obrigatório.`,
    );
  }

  return normalizedValue;
}

function normalizeOptionalText(
  value?: string | null,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue || null;
}

function normalizeCustomerCode(
  value?: number | null,
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      "Codigo do cliente deve ser um numero inteiro maior que zero.",
    );
  }

  return value;
}

function normalizeStatus(
  status?: string | null,
) {
  const normalizedStatus =
    status?.trim().toUpperCase();

  if (!normalizedStatus) {
    return "IA";
  }

  if (
    normalizedStatus !== "IA" &&
    normalizedStatus !== "HUMANO"
  ) {
    throw new Error(
      "Status inválido. Use IA ou HUMANO.",
    );
  }

  return normalizedStatus;
}

function normalizeListStatus(
  status?: string | null,
) {
  const normalizedStatus =
    status?.trim().toUpperCase();

  if (
    !normalizedStatus ||
    normalizedStatus === "TODOS"
  ) {
    return null;
  }

  if (
    normalizedStatus !== "IA" &&
    normalizedStatus !== "HUMANO"
  ) {
    throw new Error(
      "Filtro de status inválido.",
    );
  }

  return normalizedStatus;
}

export const customerService = {
  async findCustomer(
    companyId: string,
    remoteJid: string,
    phone?: string | null,
  ) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    const normalizedRemoteJid =
      requireText(
        remoteJid,
        "Identificador do cliente",
      );

    const customerByRemoteJid =
      await customerRepository.findByRemoteJid(
        normalizedCompanyId,
        normalizedRemoteJid,
      );

    if (customerByRemoteJid) {
      return customerByRemoteJid;
    }

    const normalizedPhone =
      normalizeOptionalText(phone);

    if (!normalizedPhone) {
      return null;
    }

    return customerRepository.findByPhone(
      normalizedCompanyId,
      normalizedPhone,
    );
  },

  async listCustomers(
    input: ListCustomersInput,
  ) {
    const companyId =
      requireText(
        input.companyId,
        "Empresa",
      );

    return customerRepository.listByCompany(
      companyId,
      {
        search:
          input.search,
        status:
          normalizeListStatus(
            input.status,
          ),
        responsibleId:
          input.responsibleId,
      },
    );
  },

  async saveCustomer(
    input: SaveCustomerInput,
  ) {
    const data: CustomerData = {
      companyId:
        requireText(
          input.companyId,
          "Empresa",
        ),
      remoteJid:
        requireText(
          input.remoteJid,
          "Identificador do cliente",
        ),
      name:
        input.nameManuallySet === true
          ? requireText(
              input.name,
              "Nome do cliente",
            )
          : input.name,
      customerCode:
        normalizeCustomerCode(
          input.customerCode,
        ),
      nameManuallySet:
        input.nameManuallySet === true
          ? true
          : undefined,
      phone: input.phone,
      company: input.company,
      city: input.city,
      responsible:
        input.responsible,
      responsibleId:
        input.responsibleId,
      observations:
        input.observations,
      status:
        normalizeStatus(
          input.status,
        ),
    };

    return customerRepository.upsert(
      data,
    );
  },

  async assignResponsible(
    input: AssignResponsibleInput,
  ) {
    const companyId =
      requireText(
        input.companyId,
        "Empresa",
      );

    const customerId =
      requireText(
        input.customerId,
        "Cliente",
      );

    const responsibleId =
      requireText(
        input.responsibleId,
        "Responsável",
      );

    return customerRepository.assignResponsible(
      companyId,
      customerId,
      responsibleId,
    );
  },
};
