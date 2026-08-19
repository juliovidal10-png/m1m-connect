import {
  M1MAttendanceActorType,
  M1MAttendanceState,
} from "@/generated/prisma/enums";
import {
  intentInterpreterService,
} from "@/core/router/intent-interpreter.service";
import {
  sectorIdentificationService,
} from "@/core/router/sector-identification.service";
import {
  attendanceService,
} from "@/services/attendance.service";
import {
  sectorService,
} from "@/services/sector.service";

export type RouterContext = {
  companyId: string;
  customerId: string;
  remoteJid: string;
  instanceName: string;
  messageContent: string | null;
  payload: unknown;
};

export type RouterResult = {
  processed: true;
  action:
    | "ATTENDANCE_CREATED"
    | "ATTENDANCE_REUSED"
    | "ROUTED_TO_SECTOR"
    | "SECTOR_AMBIGUOUS";
  attendanceId: string;
  attendanceNumber: number;
  sectorId: string | null;
  sectorName: string | null;
  responsibleId: string | null;
  state:
    | "IA"
    | "HUMANO"
    | "FINALIZADO";
  requiresSectorIdentification: boolean;
  availableSectors?: Array<{
    id: string;
    name: string;
  }>;
};

export class RouterService {
  async execute(
    context: RouterContext,
  ): Promise<RouterResult> {
    const existingAttendance =
      await attendanceService.getOpenAttendanceByCustomer(
        context.companyId,
        context.customerId,
      );

    const attendance =
      existingAttendance ??
      await attendanceService.startAttendance(
        context.companyId,
        context.customerId,
      );

    const wasCreated =
      !existingAttendance;

    if (
      attendance.state ===
      M1MAttendanceState.HUMANO
    ) {
      return {
        processed: true,
        action:
          "ATTENDANCE_REUSED",
        attendanceId:
          attendance.id,
        attendanceNumber:
          attendance.number,
        sectorId:
          attendance.sectorId,
        sectorName: null,
        responsibleId:
          attendance.responsibleId,
        state:
          attendance.state,
        requiresSectorIdentification:
          false,
      };
    }
    const sectors =
      await sectorService.listActiveSectors(
        context.companyId,
      );

    const intent =
      await intentInterpreterService.interpret(
        context.companyId,
        context.messageContent,
      );

    const hasDifferentMatchedSector =
      intent.matched &&
      !!intent.sectorId &&
      intent.sectorId !== attendance.sectorId;

    if (
      attendance.sectorId &&
      !hasDifferentMatchedSector
    ) {
      return {
        processed: true,
        action:
          "ROUTED_TO_SECTOR",
        attendanceId:
          attendance.id,
        attendanceNumber:
          attendance.number,
        sectorId:
          attendance.sectorId,
        sectorName:
          sectors.find(
            (sector) =>
              sector.id === attendance.sectorId,
          )?.name ?? null,
        responsibleId:
          attendance.responsibleId,
        state:
          attendance.state,
        requiresSectorIdentification:
          false,
      };
    }

    if (
      intent.matched &&
      intent.sectorId
    ) {
      const matchedSector =
        sectors.find(
          (sector) =>
            sector.id ===
            intent.sectorId,
        );

      if (matchedSector) {
        const transferred =
          await attendanceService.transferAttendanceToSector({
            companyId:
              context.companyId,
            attendanceId:
              attendance.id,
            sectorId:
              matchedSector.id,
            actorType:
              M1MAttendanceActorType.AI,
          });

        return {
          processed: true,
          action:
            "ROUTED_TO_SECTOR",
          attendanceId:
            transferred.id,
          attendanceNumber:
            transferred.number,
          sectorId:
            matchedSector.id,
          sectorName:
            matchedSector.name,
          responsibleId:
            transferred.responsibleId,
          state:
            transferred.state,
          requiresSectorIdentification:
            false,
        };
      }
    }

    const identification =
      sectorIdentificationService.identify(
        context.messageContent,
        sectors,
      );

    if (
      identification.status ===
      "IDENTIFIED"
    ) {
      const transferred =
        await attendanceService.transferAttendanceToSector({
          companyId:
            context.companyId,
          attendanceId:
            attendance.id,
          sectorId:
            identification.sector.id,
          actorType:
            M1MAttendanceActorType.AI,
        });

      return {
        processed: true,
        action:
          "ROUTED_TO_SECTOR",
        attendanceId:
          transferred.id,
        attendanceNumber:
          transferred.number,
        sectorId:
          identification.sector.id,
        sectorName:
          identification.sector.name,
        responsibleId:
          transferred.responsibleId,
        state:
          transferred.state,
        requiresSectorIdentification:
          false,
      };
    }

    const availableSectors =
      (
        identification.status ===
        "AMBIGUOUS"
          ? identification.sectors
          : sectors
      ).map(
        (sector) => ({
          id: sector.id,
          name: sector.name,
        }),
      );

    return {
      processed: true,
      action:
        identification.status ===
        "AMBIGUOUS"
          ? "SECTOR_AMBIGUOUS"
          : wasCreated
            ? "ATTENDANCE_CREATED"
            : "ATTENDANCE_REUSED",
      attendanceId:
        attendance.id,
      attendanceNumber:
        attendance.number,
      sectorId: null,
      sectorName: null,
      responsibleId:
        attendance.responsibleId,
      state:
        attendance.state,
      requiresSectorIdentification:
        true,
      availableSectors,
    };
  }
}

export const routerService =
  new RouterService();
