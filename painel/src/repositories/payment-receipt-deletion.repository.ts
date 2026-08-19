import {
  prisma,
} from "@/lib/prisma";

export const paymentReceiptDeletionRepository = {
  async findById(
    companyId: string,
    receiptId: string,
  ) {
    return prisma.m1MPaymentReceipt.findFirst({
      where: {
        id: receiptId,
        companyId,
      },
      select: {
        id: true,
        companyId: true,
        mediaUrl: true,
        fileName: true,
        messageId: true,
      },
    });
  },

  async countOtherByMediaUrl(
    companyId: string,
    mediaUrl: string,
    receiptId: string,
  ) {
    return prisma.m1MPaymentReceipt.count({
      where: {
        companyId,
        mediaUrl,
        id: {
          not: receiptId,
        },
      },
    });
  },

  async deleteReceipt(
    companyId: string,
    receiptId: string,
  ) {
    return prisma.$transaction(
      async (transaction) => {
        const receipt =
          await transaction.m1MPaymentReceipt.findFirst({
            where: {
              id: receiptId,
              companyId,
            },
            select: {
              id: true,
            },
          });

        if (!receipt) {
          return null;
        }

        await transaction.m1MPaymentReceiptEvent.deleteMany({
          where: {
            receiptId,
          },
        });

        await transaction.m1MPaymentReceipt.delete({
          where: {
            id: receiptId,
          },
        });

        return {
          id: receiptId,
        };
      },
    );
  },
};
