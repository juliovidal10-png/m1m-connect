import {
  ATTENDANCE_EVENT_TYPES,
  ATTENDANCE_STATES,
} from "./attendance.constants";

export type AttendanceState =
  (typeof ATTENDANCE_STATES)[keyof typeof ATTENDANCE_STATES];

export type AttendanceEventType =
  (typeof ATTENDANCE_EVENT_TYPES)[keyof typeof ATTENDANCE_EVENT_TYPES];

export type AttendanceActorType = "AI" | "USER" | "SYSTEM";

export interface AttendanceSnapshot {
  id: string;
  customerId: string;
  state: AttendanceState;
  responsibleId: string | null;
  startedAt: Date;
  assignedAt: Date | null;
  finishedAt: Date | null;
}

export interface AttendanceEvent {
  attendanceId: string;
  customerId: string;
  type: AttendanceEventType;
  actorType: AttendanceActorType;
  actorId: string | null;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface StartAttendanceInput {
  customerId: string;
}

export interface TakeAttendanceInput {
  attendance: AttendanceSnapshot;
  userId: string;
}

export interface FinishAttendanceInput {
  attendance: AttendanceSnapshot;
  userId: string;
}
