import { NextResponse } from 'next/server';
import { M1MUserPermission } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import { AuthorizationError, authorizationService } from '@/services/auth/authorization.service';

export async function DELETE(_request: Request, context: { params: Promise<{ customerId: string }> }) {
  try {
    const { companyId } = await authorizationService.requirePermission(M1MUserPermission.EDIT_CRM);
    const { customerId } = await context.params;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(customerId)) {
      return NextResponse.json({ error: 'Contato inválido.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async db => {
      // Lock the parent before checking links so a concurrent FK insert cannot
      // slip between the check and the delete, including cascading reminders.
      const manual = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM m1m_customers
        WHERE id = ${customerId} AND "companyId" = ${companyId} AND "createdViaNewContact"
        FOR UPDATE
      `;
      if (!manual.length) return 'unavailable';

      const removed = await db.m1MCustomer.deleteMany({
        where: {
          id: customerId,
          companyId,
          createdViaNewContact: true,
          messages: { none: {} },
          attendances: { none: {} },
          reminders: { none: {} },
          paymentReceipts: { none: {} },
        },
      });
      return removed.count === 1 ? 'removed' : 'linked';
    }, { isolationLevel: 'ReadCommitted' });

    if (result === 'unavailable') {
      return NextResponse.json({ error: 'Cadastro manual não encontrado.' }, { status: 404 });
    }
    if (result === 'linked') {
      return NextResponse.json({ error: 'Este contato tem histórico ou registros vinculados e não pode ser excluído.' }, { status: 409 });
    }
    return NextResponse.json({ removed: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Não foi possível excluir o cadastro manual. Atualize a lista e tente novamente.' }, { status: 500 });
  }
}
