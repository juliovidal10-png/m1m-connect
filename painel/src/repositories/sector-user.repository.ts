import { prisma } from "@/lib/prisma";

export const sectorUserRepository = {
  async findSector(
    companyId: string,
    sectorId: string,
  ) {
    return prisma.m1MSector.findFirst({
      where: {
        id: sectorId,
        companyId,
      },
    });
  },

  async findCompanyUsers(
    companyId: string,
  ) {
    return prisma.m1MUser.findMany({
      where: {
        companyId,
      },
      orderBy: [
        {
          active: "desc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        name: true,
        displayName: true,
        email: true,
        jobTitle: true,
        phone: true,
        active: true,
      },
    });
  },

  async findAssignedUserIds(
    sectorId: string,
  ) {
    const assignments =
      await prisma.m1MSectorUser.findMany({
        where: {
          sectorId,
        },
        select: {
          userId: true,
        },
      });

    return assignments.map(
      (assignment) => assignment.userId,
    );
  },

  async findValidUsers(
    companyId: string,
    userIds: string[],
  ) {
    return prisma.m1MUser.findMany({
      where: {
        companyId,
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
      },
    });
  },

  async replaceSectorUsers(
    sectorId: string,
    userIds: string[],
  ) {
    return prisma.$transaction(async (transaction) => {
      await transaction.m1MSectorUser.deleteMany({
        where: {
          sectorId,
        },
      });

      if (userIds.length > 0) {
        await transaction.m1MSectorUser.createMany({
          data: userIds.map((userId) => ({
            sectorId,
            userId,
          })),
          skipDuplicates: true,
        });
      }

      return transaction.m1MSectorUser.findMany({
        where: {
          sectorId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              displayName: true,
              email: true,
              jobTitle: true,
              phone: true,
              active: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    });
  },
};
