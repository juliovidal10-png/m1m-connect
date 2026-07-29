import {
  customerRepository,
  type CustomerData,
} from "@/repositories/customer.repository";

export type SaveCustomerInput = {
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

export type AssignResponsibleInput = {
  customerId: string;
  responsibleId: string;
};

function requireText(
  value: string | null | undefined,
  fieldName: string,
) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(`${fieldName} é obrigatório.`);
  }

  return normalizedValue;
}

function normalizeStatus(status?: string | null) {
  const normalizedStatus = status?.trim().toUpperCase();

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

export const customerService = {
  async findCustomer(
    companyId: string,
    remoteJid: string,
  ) {
    const normalizedCompanyId = requireText(
      companyId,
      "Empresa",
    );

    const normalizedRemoteJid = requireText(
      remoteJid,
      "Identificador do cliente",
    );

    return customerRepository.findByRemoteJid(
      normalizedCompanyId,
      normalizedRemoteJid,
    );
  },

  async saveCustomer(input: SaveCustomerInput) {
    const data: CustomerData = {
      companyId: requireText(
        input.companyId,
        "Empresa",
      ),
      remoteJid: requireText(
        input.remoteJid,
        "Identificador do cliente",
      ),
      name: input.name,
      phone: input.phone,
      company: input.company,
      city: input.city,
      responsible: input.responsible,
      observations: input.observations,
      status: normalizeStatus(input.status),
    };

    return customerRepository.upsert(data);
  },

  async assignResponsible(
    input: AssignResponsibleInput,
  ) {
    const customerId = requireText(
      input.customerId,
      "Cliente",
    );

    const responsibleId = requireText(
      input.responsibleId,
      "Responsável",
    );

    return customerRepository.assignResponsible(
      customerId,
      responsibleId,
      "HUMANO",
    );
  },
};