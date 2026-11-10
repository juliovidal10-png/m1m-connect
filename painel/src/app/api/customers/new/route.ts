import { NextResponse } from 'next/server';
import { M1MUserPermission } from '@/generated/prisma/enums';
import { InvalidContactPhone, normalizeCustomerContactPhone } from '@/lib/contact-phone';
import { AuthorizationError, authorizationService } from '@/services/auth/authorization.service';
import { createManualCustomer } from '@/services/contact-import.service';

export async function POST(request: Request) {
  try {
    const user = await authorizationService.requirePermission(M1MUserPermission.EDIT_CRM);
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 160) {
      return NextResponse.json({ error: 'Informe um nome de até 160 caracteres.' }, { status: 400 });
    }
    const phone = normalizeCustomerContactPhone(body?.phone);
    if (!phone) {
      return NextResponse.json({ error: 'Informe o telefone do cliente.' }, { status: 400 });
    }

    const created = await createManualCustomer(user.companyId, { name, phone });
    if (!created) {
      return NextResponse.json({ error: 'Este telefone já está cadastrado nesta empresa.' }, { status: 409 });
    }

    return NextResponse.json({ created: true }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof InvalidContactPhone) {
      return NextResponse.json({ error: error.message }, {
        status: error instanceof AuthorizationError ? error.statusCode : 400,
      });
    }
    return NextResponse.json({ error: 'Não foi possível cadastrar o cliente.' }, { status: 500 });
  }
}
