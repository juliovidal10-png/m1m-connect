import { ATTENDANCE_STATES } from "./attendance.constants";
import type { AttendanceSnapshot } from "./attendance.types";
import {
  canFinishAttendance,
  canTakeAttendance,
} from "./attendance.validators";

export function transitionToHuman(
  attendance: AttendanceSnapshot,
  userId: string,
  occurredAt = new Date(),
): AttendanceSnapshot {
  if (!canTakeAttendance(attendance)) {
    throw new Error(
      "Somente um atendimento em estado IA pode ser assumido.",
    );
  }

  return {
    ...attendance,
    state: ATTENDANCE_STATES.HUMAN,
    responsibleId: userId,
    assignedAt: occurredAt,
    finishedAt: null,
  };
}

export function transitionToFinished(
  attendance: AttendanceSnapshot,
  userId: string,
  occurredAt = new Date(),
): AttendanceSnapshot {
  if (!canFinishAttendance(attendance, userId)) {
    throw new Error(
      "Somente o responsável atual pode finalizar o atendimento.",
    );
  }

  return {
    ...attendance,
    state: ATTENDANCE_STATES.FINISHED,
    finishedAt: occurredAt,
  };
}
