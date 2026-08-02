import {
  M1MAttendanceActorType,
  M1MAttendanceEventType,
  M1MAttendanceState,
} from "@/generated/prisma/enums";
import {
  attendanceRepository,
  type CreateAttendanceEventData,
} from "@/repositories/attendance.repository";

type TransferAttendanceToSectorInput = {
  attendanceId: string;
  sectorId: string;
  actorType: M1MAttendanceActorType;
  actorId?: string | null;
};

export const attendanceService = {
  async startAttendance(
    companyId: string,
    customerId: string,
  ) {
    const activeAttendance =
      await attendanceRepository.findActiveAttendance(
        companyId,
        customerId,
      );

    if (activeAttendance) {
      return activeAttendance;
    }

    const attendance =
      await attendanceRepository.createAttendance({
        companyId,
        customerId,
      });

    await attendanceRepository.createEvent({
      attendanceId: attendance.id,
      type:
        M1MAttendanceEventType.STARTED_BY_AI,
      actorType:
        M1MAttendanceActorType.AI,
    });

    return attendance;
  },

  async transferAttendanceToSector(
    input: TransferAttendanceToSectorInput,
  ) {
    const attendance =
      await attendanceRepository.findAttendanceById(
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

    const sector =
      await attendanceRepository.findSector(
        attendance.companyId,
        input.sectorId,
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
      return attendance;
    }

    const previousSectorId =
      attendance.sectorId;

    const updatedAttendance =
      await attendanceRepository.transferToSector({
        attendanceId:
          attendance.id,
        sectorId:
          sector.id,
      });

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
    });

    return updatedAttendance;
  },

  async assumeAttendance(
    attendanceId: string,
    responsibleId: string,
  ) {
    const attendance =
      await attendanceRepository.findAttendanceById(
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
      return attendance;
    }

    const updatedAttendance =
      await attendanceRepository.assignAttendance({
        attendanceId,
        responsibleId,
      });

    await attendanceRepository.createEvent({
      attendanceId,
      type:
        M1MAttendanceEventType.TAKEN_BY_HUMAN,
      actorType:
        M1MAttendanceActorType.USER,
      actorId:
        responsibleId,
    });

    return updatedAttendance;
  },

  async finishAttendance(
    attendanceId: string,
  ) {
    const attendance =
      await attendanceRepository.findAttendanceById(
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

    if (!attendance.responsibleId) {
      throw new Error(
        "O atendimento não possui um responsável humano.",
      );
    }

    const updatedAttendance =
      await attendanceRepository.finishAttendance({
        attendanceId,
      });

    await attendanceRepository.createEvent({
      attendanceId,
      type:
        M1MAttendanceEventType.FINISHED_BY_HUMAN,
      actorType:
        M1MAttendanceActorType.USER,
      actorId:
        attendance.responsibleId,
    });

    return updatedAttendance;
  },

  async finishAttendanceByAI(
    attendanceId: string,
  ) {
    const attendance =
      await attendanceRepository.findAttendanceById(
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
        attendanceId,
      });

    await attendanceRepository.createEvent({
      attendanceId,
      type:
        M1MAttendanceEventType.FINISHED_BY_AI,
      actorType:
        M1MAttendanceActorType.AI,
    });

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
