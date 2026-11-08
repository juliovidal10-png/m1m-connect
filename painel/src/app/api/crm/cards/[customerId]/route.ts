import { NextRequest, NextResponse } from 'next/server';
import { M1MUserPermission } from '@/generated/prisma/enums';
import { AuthorizationError, authorizationService } from '@/services/auth/authorization.service';
import { crmService } from '@/services/crm.service';

export async function DELETE(_request: NextRequest, context: { params: Promise<{ customerId: string }> }) {
  try {
    const user = await authorizationService.requirePermission(M1MUserPermission.EDIT_CRM);
    const { customerId } = await context.params;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(customerId)) return NextResponse.json({ error: 'Card inválido.' }, { status: 400 });
    const result = await crmService.removeCard(user.companyId, customerId);
    return result ? NextResponse.json(result) : NextResponse.json({ error: 'Card não encontrado.' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof AuthorizationError ? error.message : 'Não foi possível excluir o card.' }, {
      status: error instanceof AuthorizationError ? error.statusCode : 500,
    });
  }
}
