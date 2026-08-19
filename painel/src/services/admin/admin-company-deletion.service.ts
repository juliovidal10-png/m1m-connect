import {
  prisma,
} from "@/lib/prisma";

export const adminCompanyDeletionService = {
  async deleteCompany(
    companyId: string,
  ) {
    return prisma.$transaction(
      async (tx) => {
        const company =
          await tx.m1MCompany.findUnique({
            where: {
              id: companyId,
            },
            select: {
              id: true,
              name: true,
              slug: true,
            },
          });

        if (!company) {
          throw new Error(
            "Empresa não encontrada.",
          );
        }

        const attendanceIds =
          (
            await tx.m1MAttendance.findMany({
              where: {
                companyId,
              },
              select: {
                id: true,
              },
            })
          ).map(
            (
              item,
            ) => item.id,
          );

        const messageIds =
          (
            await tx.m1MMessage.findMany({
              where: {
                companyId,
              },
              select: {
                id: true,
              },
            })
          ).map(
            (
              item,
            ) => item.id,
          );

        const receiptIds =
          (
            await tx.m1MPaymentReceipt.findMany({
              where: {
                companyId,
              },
              select: {
                id: true,
              },
            })
          ).map(
            (
              item,
            ) => item.id,
          );

        if (
          attendanceIds.length >
          0
        ) {
          await tx.m1MAttendanceEvent.deleteMany({
            where: {
              attendanceId: {
                in:
                  attendanceIds,
              },
            },
          });
        }

        if (
          messageIds.length >
          0
        ) {
          await tx.m1MMessageFlag.deleteMany({
            where: {
              messageId: {
                in:
                  messageIds,
              },
            },
          });
        }

        if (
          receiptIds.length >
          0
        ) {
          await tx.m1MPaymentReceiptEvent.deleteMany({
            where: {
              receiptId: {
                in:
                  receiptIds,
              },
            },
          });
        }

        await tx.m1MPaymentReceipt.deleteMany({
          where: {
            companyId,
          },
        });

        await tx.m1MMessage.deleteMany({
          where: {
            companyId,
          },
        });

        await tx.m1MAttendance.deleteMany({
          where: {
            companyId,
          },
        });

        await tx.m1MReminder.deleteMany({
          where: {
            companyId,
          },
        });

        await tx.m1MCustomer.deleteMany({
          where: {
            companyId,
          },
        });

        await tx.m1MUser.deleteMany({
          where: {
            companyId,
          },
        });

        await tx.m1MCompany.delete({
          where: {
            id: companyId,
          },
        });

        return {
          id:
            company.id,
          name:
            company.name,
          slug:
            company.slug,
        };
      },
      {
        timeout:
          30000,
      },
    );
  },
};
