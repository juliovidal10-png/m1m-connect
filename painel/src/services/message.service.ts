import {
  messageRepository,
  type CreateMessageData,
} from "@/repositories/message.repository";

export const REVOKED_MESSAGE_CONTENT =
  "🚫 Esta mensagem foi apagada.";

export const messageService = {
  async registerMessage(data: CreateMessageData) {
    const existingMessage =
      await messageRepository.findMessageByEvolutionId(
        data.companyId,
        data.instanceName,
        data.evolutionMessageId,
      );

    if (existingMessage) {
      if (
        data.content ===
        REVOKED_MESSAGE_CONTENT
      ) {
        return messageRepository.markMessageAsRevoked(
          data.companyId,
          data.instanceName,
          data.evolutionMessageId,
          data.rawPayload,
        );
      }

      if (
        data.authorType &&
        !existingMessage.authorType
      ) {
        return messageRepository.setAuthorship(
          existingMessage.id,
          data.authorType,
          data.authorId,
          data.authorName,
        );
      }

      return existingMessage;
    }

    try {
      return await messageRepository.createMessage(
        data,
      );
    } catch (error) {
      /*
       * Se dois webhooks tentarem criar a mesma
       * mensagem ao mesmo tempo, a chave única
       * do banco permite recuperar o registro
       * criado pela primeira execução.
       */
      const concurrentMessage =
        await messageRepository.findMessageByEvolutionId(
          data.companyId,
          data.instanceName,
          data.evolutionMessageId,
        );

      if (concurrentMessage) {
        return concurrentMessage;
      }

      throw error;
    }
  },

  async markMessageAsRevoked(
    companyId: string,
    instanceName: string,
    evolutionMessageId: string,
    rawPayload?: CreateMessageData["rawPayload"],
  ) {
    return messageRepository.markMessageAsRevoked(
      companyId,
      instanceName,
      evolutionMessageId,
      rawPayload,
    );
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

  async attachMessageToAttendance(
    messageId: string,
    attendanceId: string,
  ) {
    return messageRepository.attachMessageToAttendance(
      messageId,
      attendanceId,
    );
  },

  async listMessagesByAttendance(
    attendanceId: string,
  ) {
    return messageRepository.listMessagesByAttendance(
      attendanceId,
    );
  },

  async claimProcessing(
    messageId: string,
  ) {
    return messageRepository.claimProcessing(
      messageId,
    );
  },

  async releaseProcessing(
    messageId: string,
  ) {
    return messageRepository.releaseProcessing(
      messageId,
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

