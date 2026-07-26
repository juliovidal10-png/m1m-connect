import {
  reminderRepository,
  type CreateReminderData,
} from "@/repositories/reminder.repository";

export type CreateReminderInput = {
  companyId: string;
  customerId: string;
  title: string;
  description?: string | null;
  remindAt: string;
  responsible?: string | null;
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

function parseReminderDate(value: string) {
  const normalizedValue = requireText(
    value,
    "Data e horário",
  );

  const reminderDate = new Date(normalizedValue);

  if (Number.isNaN(reminderDate.getTime())) {
    throw new Error(
      "Data e horário do lembrete são inválidos.",
    );
  }

  return reminderDate;
}

export const reminderService = {
  async listCustomerReminders(
    companyId: string,
    customerId: string,
  ) {
    const normalizedCompanyId = requireText(
      companyId,
      "Empresa",
    );

    const normalizedCustomerId = requireText(
      customerId,
      "Cliente",
    );

    return reminderRepository.findPendingByCustomer(
      normalizedCompanyId,
      normalizedCustomerId,
    );
  },

  async listCompanyReminders(
    companyId: string,
  ) {
    const normalizedCompanyId = requireText(
      companyId,
      "Empresa",
    );

    return reminderRepository.findPendingByCompany(
      normalizedCompanyId,
    );
  },

  async createReminder(
    input: CreateReminderInput,
  ) {
    const data: CreateReminderData = {
      companyId: requireText(
        input.companyId,
        "Empresa",
      ),
      customerId: requireText(
        input.customerId,
        "Cliente",
      ),
      title: requireText(
        input.title,
        "Título",
      ),
      description: input.description,
      remindAt: parseReminderDate(
        input.remindAt,
      ),
      responsible: input.responsible,
    };

    return reminderRepository.create(data);
  },

  async completeReminder(
    id: string,
    companyId: string,
  ) {
    const normalizedId = requireText(
      id,
      "Lembrete",
    );

    const normalizedCompanyId = requireText(
      companyId,
      "Empresa",
    );

    return reminderRepository.complete(
      normalizedId,
      normalizedCompanyId,
    );
  },

  async postponeReminder(
    id: string,
    companyId: string,
    remindAt: string,
  ) {
    const normalizedId = requireText(
      id,
      "Lembrete",
    );

    const normalizedCompanyId = requireText(
      companyId,
      "Empresa",
    );

    const updatedReminder =
      await reminderRepository.postpone(
        normalizedId,
        normalizedCompanyId,
        parseReminderDate(remindAt),
      );

    if (!updatedReminder) {
      throw new Error(
        "Lembrete não encontrado.",
      );
    }

    return updatedReminder;
  },

  async markReminderAsNotified(
    id: string,
    companyId: string,
  ) {
    const normalizedId = requireText(
      id,
      "Lembrete",
    );

    const normalizedCompanyId = requireText(
      companyId,
      "Empresa",
    );

    const updatedReminder =
      await reminderRepository.markAsNotified(
        normalizedId,
        normalizedCompanyId,
      );

    if (!updatedReminder) {
      throw new Error(
        "Lembrete não encontrado.",
      );
    }

    return updatedReminder;
  },
};