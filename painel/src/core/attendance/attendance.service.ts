import { ATTENDANCE_STATES } from "./attendance.constants";
import {
  createFinishedByHumanEvent,
  createStartedByAIEvent,
  createTakenByHumanEvent,
} from "./attendance.events";
import {
  transitionToFinished,
  transitionToHuman,
} from "./attendance.machine";
import type {
  AttendanceEvent,
  AttendanceSnapshot,
  FinishAttendanceInput,
  StartAttendanceInput,
  TakeAttendanceInput,
} from "./attendance.types";

export interface AttendanceActionResult {
  attendance: AttendanceSnapshot;
  event: AttendanceEvent;
}

export class AttendanceService {
  startAttendance(
    input: StartAttendanceInput,
    attendanceId: string,
    occurredAt = new Date(),
  ): AttendanceActionResult {
    const attendance: AttendanceSnapshot = {
      id: attendanceId,
      customerId: input.customerId,
      state: ATTENDANCE_STATES.AI,
      responsibleId: null,
      startedAt: occurredAt,
      assignedAt: null,
      finishedAt: null,
    };

    return {
      attendance,
      event: createStartedByAIEvent(attendance, occurredAt),
    };
  }

  takeAttendance(
    input: TakeAttendanceInput,
    occurredAt = new Date(),
  ): AttendanceActionResult {
    const attendance = transitionToHuman(
      input.attendance,
      input.userId,
      occurredAt,
    );

    return {
      attendance,
      event: createTakenByHumanEvent(
        attendance,
        input.userId,
        occurredAt,
      ),
    };
  }

  finishAttendance(
    input: FinishAttendanceInput,
    occurredAt = new Date(),
  ): AttendanceActionResult {
    const attendance = transitionToFinished(
      input.attendance,
      input.userId,
      occurredAt,
    );

    return {
      attendance,
      event: createFinishedByHumanEvent(
        attendance,
        input.userId,
        occurredAt,
      ),
    };
  }
}

export const attendanceService = new AttendanceService();
