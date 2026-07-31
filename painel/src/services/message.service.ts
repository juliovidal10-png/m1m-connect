import {
  messageRepository,
  type CreateMessageData,
} from "@/repositories/message.repository";

export const messageService = {
  async registerMessage(data: CreateMessageData) {
    const existingMessage =
      await messageRepository.findMessageByEvolutionId(
        data.companyId,
        data.instanceName,
        data.evolutionMessageId,
      );

    if (existingMessage) {
      return existingMessage;
    }

    return messageRepository.createMessage(data);
  },

  async getMessageByEvolutionId(
    companyId: string,
    instanceName: string,
    evolutionMessageId: string,
  ) {
    return messageRepository.findMessageByEvolutionId(
      companyId,
      instanceName,
      evolutionMessageId,
    );
  },

  async listMessagesByCustomer(
    companyId: string,
    customerId: string,
  ) {
    return messageRepository.listMessagesByCustomer(
      companyId,
      customerId,
    );
  },

  async listMessagesByAttendance(
    attendanceId: string,
  ) {
    return messageRepository.listMessagesByAttendance(
      attendanceId,
    );
  },

  async markAsProcessed(
    messageId: string,
    processedAt?: Date,
  ) {
    return messageRepository.markAsProcessed(
      messageId,
      processedAt,
    );
  },
};