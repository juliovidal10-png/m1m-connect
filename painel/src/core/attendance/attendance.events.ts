import { ATTENDANCE_EVENT_TYPES } from "./attendance.constants";
import type {
  AttendanceEvent,
  AttendanceSnapshot,
} from "./attendance.types";

export function createStartedByAIEvent(
  attendance: AttendanceSnapshot,
  occurredAt = new Date(),
): AttendanceEvent {
  return {
    attendanceId: attendance.id,
    customerId: attendance.customerId,
    type: ATTENDANCE_EVENT_TYPES.STARTED_BY_AI,
    actorType: "AI",
    actorId: null,
    createdAt: occurredAt,
  };
}

export function createTakenByHumanEvent(
  attendance: AttendanceSnapshot,
  userId: string,
  occurredAt = new Date(),
): AttendanceEvent {
  return {
    attendanceId: attendance.id,
    customerId: attendance.customerId,
    type: ATTENDANCE_EVENT_TYPES.TAKEN_BY_HUMAN,
    actorType: "USER",
    actorId: userId,
    createdAt: occurredAt,
  };
}

export function createFinishedByHumanEvent(
  attendance: AttendanceSnapshot,
  userId: string,
  occurredAt = new Date(),
): AttendanceEvent {
  return {
    attendanceId: attendance.id,
    customerId: attendance.customerId,
    type: ATTENDANCE_EVENT_TYPES.FINISHED_BY_HUMAN,
    actorType: "USER",
    actorId: userId,
    createdAt: occurredAt,
  };
}
