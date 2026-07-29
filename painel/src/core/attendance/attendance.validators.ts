import { ATTENDANCE_STATES } from "./attendance.constants";
import type { AttendanceSnapshot } from "./attendance.types";

export function canTakeAttendance(
  attendance: AttendanceSnapshot,
): boolean {
  return attendance.state === ATTENDANCE_STATES.AI;
}

export function canFinishAttendance(
  attendance: AttendanceSnapshot,
  userId: string,
): boolean {
  return (
    attendance.state === ATTENDANCE_STATES.HUMAN &&
    attendance.responsibleId === userId
  );
}

export function canAIRespond(
  attendance: AttendanceSnapshot | null,
): boolean {
  return (
    attendance === null ||
    attendance.state === ATTENDANCE_STATES.AI ||
    attendance.state === ATTENDANCE_STATES.FINISHED
  );
}

export function canStartNewAttendance(
  attendance: AttendanceSnapshot | null,
): boolean {
  return (
    attendance === null ||
    attendance.state === ATTENDANCE_STATES.FINISHED
  );
}
