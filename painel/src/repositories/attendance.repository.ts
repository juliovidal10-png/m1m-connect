import {
  M1MAttendanceActorType,
  M1MAttendanceEventType,
  M1MAttendanceState,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type CreateAttendanceData = {
  companyId: string;
  customerId: string;
  startedAt?: Date;
};

export type AssignAttendanceData = {
  companyId: string;
  attendanceId: string;
  responsibleId: string;
  assignedAt?: Date;
};

export type TakeoverAttendanceData = {
  companyId: string;
  attendanceId: string;
  assignedAt?: Date;
};

export type TransferAttendanceToSectorData = {
  companyId: string;
  attendanceId: string;
  sectorId: string;
};

export type RouteAttendanceToSectorByAIData = {
  companyId: string;
  attendanceId: string;
  sectorId: string;
};

export type FinishAttendanceData = {
  companyId: string;
  attendanceId: string;
  finishedAt?: Date;
};

export type CreateAttendanceEventData = {
  attendanceId: string;
  type: M1MAttendanceEventType;
  actorType: M1MAttendanceActorType;
  actorId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  createdAt?: Date;
};

const activeAttendanceStates: M1MAttendanceState[] = [
  M1MAttendanceState.IA,
  M1MAttendanceState.HUMANO,
];

async function requireAttendance(
  companyId: string,
  attendanceId: string,
) {
  const attendance =
    await prisma.m1MAttendance.findFirst({
      where: {
        id: attendanceId,
        companyId,
      },
      include: {
        responsible: true,
        sector: true,
      },
    });

  if (!attendance) {
    throw new Error(
      "Atendimento não encontrado.",
    );
  }

  return attendance;
}

export const attendanceRepository = {
  async createAttendance(
    data: CreateAttendanceData,
  ) {
    return prisma.m1MAttendance.create({
      data: {
        companyId: data.companyId,
        customerId: data.customerId,
        state: M1MAttendanceState.IA,
        startedAt:
          data.startedAt ?? new Date(),
      },
    });
  },

  async findActiveAttendance(
    companyId: string,
    customerId: string,
  ) {
    return prisma.m1MAttendance.findFirst({
      where: {
        companyId,
        customerId,
        state: {
          in: activeAttendanceStates,
        },
      },
      orderBy: {
        startedAt: "desc",
      },
    });
  },

  async findAttendanceById(
    companyId: string,
    attendanceId: string,
  ) {
    return prisma.m1MAttendance.findFirst({
      where: {
        id: attendanceId,
        companyId,
      },
      include: {
        responsible: true,
        sector: true,
      },
    });
  },

  async findSector(
    companyId: string,
    sectorId: string,
  ) {
    return prisma.m1MSector.findFirst({
      where: {
        id: sectorId,
        companyId,
        active: true,
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        active: true,
      },
    });
  },

  async assignAttendance(
    data: AssignAttendanceData,
  ) {
    const attendance =
      await requireAttendance(
        data.companyId,
        data.attendanceId,
      );

    return prisma.m1MAttendance.update({
      where: {
        id: attendance.id,
      },
      data: {
        state:
          M1MAttendanceState.HUMANO,
        responsibleId:
          data.responsibleId,
        assignedAt:
          data.assignedAt ?? new Date(),
        finishedAt: null,
      },
    });
  },

  async takeoverAttendance(
    data: TakeoverAttendanceData,
  ) {
    const attendance =
      await requireAttendance(
        data.companyId,
        data.attendanceId,
      );

    return prisma.m1MAttendance.update({
      where: {
        id: attendance.id,
      },
      data: {
        state:
          M1MAttendanceState.HUMANO,
        assignedAt:
          data.assignedAt ?? new Date(),
        finishedAt: null,
      },
    });
  },

  async transferToSector(
    data: TransferAttendanceToSectorData,
  ) {
    const attendance =
      await requireAttendance(
        data.companyId,
        data.attendanceId,
      );

    return prisma.m1MAttendance.update({
      where: {
        id: attendance.id,
      },
      data: {
        sectorId:
          data.sectorId,
        state:
          M1MAttendanceState.HUMANO,
        responsibleId: null,
        assignedAt: null,
        finishedAt: null,
      },
      include: {
        sector: true,
      },
    });
  },

  async routeToSectorByAI(
    data: RouteAttendanceToSectorByAIData,
  ) {
    const attendance =
      await requireAttendance(
        data.companyId,
        data.attendanceId,
      );

    return prisma.m1MAttendance.update({
      where: {
        id: attendance.id,
      },
      data: {
        sectorId:
          data.sectorId,
        state:
          M1MAttendanceState.IA,
        responsibleId: null,
        assignedAt: null,
        finishedAt: null,
      },
      include: {
        sector: true,
      },
    });
  },

  async finishAttendance(
    data: FinishAttendanceData,
  ) {
    const attendance =
      await requireAttendance(
        data.companyId,
        data.attendanceId,
      );

    return prisma.m1MAttendance.update({
      where: {
        id: attendance.id,
      },
      data: {
        state:
          M1MAttendanceState.FINALIZADO,
        finishedAt:
          data.finishedAt ?? new Date(),
      },
    });
  },

  async createEvent(
    data: CreateAttendanceEventData,
  ) {
    return prisma.m1MAttendanceEvent.create({
      data: {
        attendanceId:
          data.attendanceId,
        type:
          data.type,
        actorType:
          data.actorType,
        actorId:
          data.actorId ?? null,
        metadata:
          data.metadata ?? undefined,
        createdAt:
          data.createdAt ?? new Date(),
      },
    });
  },

  async listEvents(
    attendanceId: string,
  ) {
    return prisma.m1MAttendanceEvent.findMany({
      where: {
        attendanceId,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  },
};

