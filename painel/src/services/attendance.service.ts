import type { Prisma } from "@/generated/prisma/client";
import {
  M1MAttendanceActorType,
  M1MAttendanceEventType,
  M1MAttendanceState,
} from "@/generated/prisma/enums";
import {
  attendanceRepository,
  type CreateAttendanceEventData,
} from "@/repositories/attendance.repository";
import { customerRepository } from "@/repositories/customer.repository";

type TransferAttendanceToSectorInput = {
  companyId: string;
  attendanceId: string;
  sectorId: string;
  actorType: M1MAttendanceActorType;
  actorId?: string | null;
};

type TakeoverFromWhatsAppInput = {
  companyId: string;
  customerId: string;
  remoteJid: string;
  messageId: string;
};
type AIHandoffReason =
  | "CUSTOMER_REQUEST"
  | "INFORMATION_UNAVAILABLE"
  | "HUMAN_ACTION_REQUIRED"
  | "BUSINESS_RULE"
  | "OTHER";

type RequestHumanAttendanceByAIInput = {
  companyId: string;
  attendanceId: string;
  sectorId: string;
  handoffReason: AIHandoffReason;
  subject?: string | null;
  context?: string | null;
};

export class AttendanceConflictError extends Error {
  constructor(
    message =
      "Este atendimento já foi assumido por outro atendente.",
  ) {
    super(message);
    this.name = "AttendanceConflictError";
  }
}
export const attendanceService = {
  async startAttendance(
    companyId: string,
    customerId: string,
    db?: Prisma.TransactionClient,
  ) {
    const activeAttendance =
      await attendanceRepository.findActiveAttendance(
        companyId,
        customerId,
        db,
      );

    if (activeAttendance) {
      return activeAttendance;
    }

    const attendance =
      await attendanceRepository.createAttendance({
        companyId,
        customerId,
      }, db);

    await attendanceRepository.createEvent({
      attendanceId: attendance.id,
      type:
        M1MAttendanceEventType.STARTED_BY_AI,
      actorType:
        M1MAttendanceActorType.AI,
    }, db);

    return attendance;
  },

  async transferAttendanceToSector(
    input: TransferAttendanceToSectorInput,
    db?: Prisma.TransactionClient,
  ) {
    const attendance =
      await attendanceRepository.findAttendanceById(
        input.companyId,
        input.attendanceId,
        db,
      );

    if (!attendance) {
      throw new Error(
        "Atendimento não encontrado.",
      );
    }

    if (
      attendance.state ===
      M1MAttendanceState.FINALIZADO
    ) {
      throw new Error(
        "Não é possível encaminhar um atendimento finalizado.",
      );
    }

    const sector =
      await attendanceRepository.findSector(
        input.companyId,
        input.sectorId,
        db,
      );

    if (!sector) {
      throw new Error(
        "Setor não encontrado ou inativo.",
      );
    }

    if (
      attendance.sectorId ===
        sector.id &&
      attendance.state ===
        M1MAttendanceState.IA &&
      !attendance.responsibleId
    ) {
      await customerRepository.releaseResponsible(
        input.companyId,
        attendance.customerId,
        db,
      );

      return attendance;
    }

    const previousSectorId =
      attendance.sectorId;
    const isAIRouting =
      input.actorType ===
      M1MAttendanceActorType.AI;

    const updatedAttendance =
      isAIRouting
        ? await attendanceRepository.routeToSectorByAI({
            companyId:
              input.companyId,
            attendanceId:
              attendance.id,
            sectorId:
              sector.id,
          }, db)
        : await attendanceRepository.transferToSector({
            companyId:
              input.companyId,
            attendanceId:
              attendance.id,
            sectorId:
              sector.id,
          }, db);

    await customerRepository.releaseResponsible(
      input.companyId,
      attendance.customerId,
      db,
    );

    if (!isAIRouting) {
      await customerRepository.markAsHuman(
        input.companyId,
        attendance.customerId,
        db,
      );
    }


    await attendanceRepository.createEvent({
      attendanceId:
        attendance.id,
      type:
        M1MAttendanceEventType.TRANSFERRED_TO_SECTOR,
      actorType:
        input.actorType,
      actorId:
        input.actorId ?? null,
      metadata: {
        previousSectorId,
        sectorId:
          sector.id,
        sectorName:
          sector.name,
      },
    }, db);

    return updatedAttendance;
  },

  async requestHumanAttendanceByAI(
    input: RequestHumanAttendanceByAIInput,
  ) {
    const attendance =
      await attendanceRepository.findAttendanceById(
        input.companyId,
        input.attendanceId,
      );

    if (!attendance) {
      throw new Error(
        "Atendimento não encontrado.",
      );
    }

    if (
      attendance.state ===
      M1MAttendanceState.FINALIZADO
    ) {
      throw new Error(
        "Não é possível encaminhar um atendimento finalizado.",
      );
    }

    if (
      attendance.state ===
      M1MAttendanceState.HUMANO
    ) {
      return attendance;
    }

    const sector =
      await attendanceRepository.findSector(
        input.companyId,
        input.sectorId,
      );

    if (!sector) {
      throw new Error(
        "Setor não encontrado ou inativo.",
      );
    }

    const previousSectorId =
      attendance.sectorId;

    const updatedAttendance =
      await attendanceRepository.transferToSector({
        companyId:
          input.companyId,
        attendanceId:
          attendance.id,
        sectorId:
          sector.id,
      });

    await customerRepository.releaseResponsible(
      input.companyId,
      attendance.customerId,
    );

    await customerRepository.markAsHuman(
      input.companyId,
      attendance.customerId,
    );

    await attendanceRepository.createEvent({
      attendanceId:
        attendance.id,
      type:
        M1MAttendanceEventType.TRANSFERRED_TO_SECTOR,
      actorType:
        M1MAttendanceActorType.AI,
      metadata: {
        source:
          "AI_HANDOFF",
        previousSectorId,
        sectorId:
          sector.id,
        sectorName:
          sector.name,
        handoffReason:
          input.handoffReason,
        subject:
          input.subject?.trim() || null,
        context:
          input.context?.trim() || null,
      },
    });

    return updatedAttendance;
  },
  async assumeAttendanceWithAcquisitionResult(
    companyId: string,
    attendanceId: string,
    responsibleId: string,
    metadata?: CreateAttendanceEventData["metadata"],
    db?: Prisma.TransactionClient,
  ) {
    const attendance =
      await attendanceRepository.findAttendanceById(
        companyId,
        attendanceId,
        db,
      );

    if (!attendance) {
      throw new Error(
        "Atendimento não encontrado.",
      );
    }

    if (
      attendance.state ===
      M1MAttendanceState.FINALIZADO
    ) {
      throw new Error(
        "Não é possível assumir um atendimento finalizado.",
      );
    }

    if (
      attendance.state ===
        M1MAttendanceState.HUMANO &&
      attendance.responsibleId ===
        responsibleId
    ) {
      return {
        attendance,
        acquiredNow: false,
      };
    }

    if (attendance.responsibleId) {
      throw new AttendanceConflictError();
    }

    const updatedAttendance =
      await attendanceRepository.assignAttendance({
        companyId,
        attendanceId,
        responsibleId,
      }, db);

    if (!updatedAttendance) {
      const currentAttendance =
        await attendanceRepository.findAttendanceById(
          companyId,
          attendanceId,
          db,
        );

      if (
        currentAttendance?.state ===
          M1MAttendanceState.HUMANO &&
        currentAttendance.responsibleId ===
          responsibleId
      ) {
        return {
          attendance:
            currentAttendance,
          acquiredNow: false,
        };
      }

      throw new AttendanceConflictError();
    }

    await attendanceRepository.createEvent({
      attendanceId,
      type:
        M1MAttendanceEventType.TAKEN_BY_HUMAN,
      actorType:
        M1MAttendanceActorType.USER,
      actorId:
        responsibleId,
      metadata,
    }, db);

    return {
      attendance:
        updatedAttendance,
      acquiredNow: true,
    };
  },

  async assumeAttendance(
    companyId: string,
    attendanceId: string,
    responsibleId: string,
  ) {
    const result =
      await this.assumeAttendanceWithAcquisitionResult(
        companyId,
        attendanceId,
        responsibleId,
      );

    return result.attendance;
  },

  async takeoverFromWhatsApp(
    input: TakeoverFromWhatsAppInput,
  ) {
    const activeAttendance =
      await attendanceRepository.findActiveAttendance(
        input.companyId,
        input.customerId,
      );

    const attendance =
      activeAttendance ??
      (await this.startAttendance(
        input.companyId,
        input.customerId,
      ));

    if (
      attendance.state ===
      M1MAttendanceState.HUMANO
    ) {
      return attendance;
    }

    const updatedAttendance =
      await attendanceRepository.takeoverAttendance({
        companyId:
          input.companyId,
        attendanceId:
          attendance.id,
      });

    await attendanceRepository.createEvent({
      attendanceId:
        attendance.id,
      type:
        M1MAttendanceEventType.TAKEN_BY_HUMAN,
      actorType:
        M1MAttendanceActorType.USER,
      actorId:
        attendance.responsibleId ?? null,
      metadata: {
        source:
          "WHATSAPP_MANUAL_MESSAGE",
        remoteJid:
          input.remoteJid,
        messageId:
          input.messageId,
      },
    });

    return updatedAttendance;
  },

  async finishAttendance(
    companyId: string,
    attendanceId: string,
    actorId?: string | null,
    db?: Prisma.TransactionClient,
  ) {
    const attendance =
      await attendanceRepository.findAttendanceById(
        companyId,
        attendanceId,
        db,
      );

    if (!attendance) {
      throw new Error(
        "Atendimento não encontrado.",
      );
    }

    if (
      attendance.state ===
      M1MAttendanceState.FINALIZADO
    ) {
      return attendance;
    }
    const updatedAttendance =
      await attendanceRepository.finishAttendance({
        companyId,
        attendanceId,
      }, db);

    await attendanceRepository.createEvent({
      attendanceId,
      type:
        M1MAttendanceEventType.FINISHED_BY_HUMAN,
      actorType:
        M1MAttendanceActorType.USER,
      actorId:
        attendance.responsibleId ??
        actorId ??
        null,
    }, db);

    await customerRepository.releaseResponsible(
      companyId,
      attendance.customerId,
      db,
    );

    return updatedAttendance;
  },

  async finishAttendanceByAI(
    companyId: string,
    attendanceId: string,
  ) {
    const attendance =
      await attendanceRepository.findAttendanceById(
        companyId,
        attendanceId,
      );

    if (!attendance) {
      throw new Error(
        "Atendimento não encontrado.",
      );
    }

    if (
      attendance.state ===
      M1MAttendanceState.FINALIZADO
    ) {
      return attendance;
    }

    if (
      attendance.state !==
      M1MAttendanceState.IA
    ) {
      throw new Error(
        "Somente atendimentos conduzidos pela IA podem ser finalizados pela IA.",
      );
    }

    const updatedAttendance =
      await attendanceRepository.finishAttendance({
        companyId,
        attendanceId,
      });

    await attendanceRepository.createEvent({
      attendanceId,
      type:
        M1MAttendanceEventType.FINISHED_BY_AI,
      actorType:
        M1MAttendanceActorType.AI,
    });

    await customerRepository.releaseResponsible(
      companyId,
      attendance.customerId,
    );

    return updatedAttendance;
  },

  async finishHumanAttendanceForNextConversation(

    companyId: string,

    attendanceId: string,

  ) {

    const attendance =

      await attendanceRepository.findAttendanceById(

        companyId,

        attendanceId,

      );


    if (!attendance) {

      throw new Error(

        "Atendimento nao encontrado.",

      );

    }


    if (

      attendance.state ===

      M1MAttendanceState.FINALIZADO

    ) {

      return attendance;

    }


    if (

      attendance.state !==

      M1MAttendanceState.HUMANO

    ) {

      throw new Error(

        "Somente atendimento humano pode ser encerrado automaticamente por nova conversa.",

      );

    }


    const updatedAttendance =

      await attendanceRepository.finishAttendance({

        companyId,

        attendanceId,

      });


    await attendanceRepository.createEvent({

      attendanceId,

      type:

        M1MAttendanceEventType.FINISHED_BY_HUMAN,

      actorType:

        M1MAttendanceActorType.SYSTEM,

      actorId: null,

      metadata: {

        source: "NEXT_CONVERSATION_TIMEOUT",

        inactivityHours: 12,

      },

    });


    await customerRepository.releaseResponsible(

      companyId,

      attendance.customerId,

    );


    return updatedAttendance;

  },

  async getOpenAttendanceByCustomer(
    companyId: string,
    customerId: string,
  ) {
    return attendanceRepository.findActiveAttendance(
      companyId,
      customerId,
    );
  },

  async registerEvent(
    data: CreateAttendanceEventData,
  ) {
    return attendanceRepository.createEvent(
      data,
    );
  },
};




