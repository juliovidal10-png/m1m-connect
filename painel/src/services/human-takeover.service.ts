import {
  customerRepository,
} from "@/repositories/customer.repository";
import {
  attendanceService,
} from "@/services/attendance.service";

type HumanTakeoverInput = {
  companyId: string;
  customerId: string;
  remoteJid: string;
  evolutionMessageId: string;
  responsibleId?: string | null;
};

export const humanTakeoverService = {
  async process(
    input: HumanTakeoverInput,
  ) {
    const attendance =
      input.responsibleId
        ? await attendanceService.assumeAttendance(
            input.companyId,
            (
              await attendanceService.startAttendance(
                input.companyId,
                input.customerId,
              )
            ).id,
            input.responsibleId,
          )
        : await attendanceService.takeoverFromWhatsApp({
            companyId:
              input.companyId,
            customerId:
              input.customerId,
            remoteJid:
              input.remoteJid,
            messageId:
              input.evolutionMessageId,
          });

    const customer =
      await customerRepository.markAsHuman(
        input.companyId,
        input.customerId,
      );

    return {
      attendanceId:
        attendance.id,
      attendanceState:
        attendance.state,
      customerStatus:
        customer.status,
      responsibleId:
        attendance.responsibleId,
    };
  },
};
