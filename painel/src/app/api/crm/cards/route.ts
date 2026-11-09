import { after, NextResponse } from 'next/server';
import { M1MUserPermission } from '@/generated/prisma/enums';
import { AuthorizationError, authorizationService } from '@/services/auth/authorization.service';
import { crmService } from '@/services/crm.service';
import { customerService } from '@/services/customer.service';
import { enrichCustomerDisplayIdentities } from '@/services/customer-display-identity.service';

export async function GET() {
  const startedAt = Date.now();
  try {
    const user = await authorizationService.getCurrentUser();
    const ids = await crmService.visibleCustomerIds(user.companyId);
    const customers = ids.size
      ? await customerService.listCustomers({ companyId: user.companyId, customerIds: [...ids] })
      : [];
    const cards = await enrichCustomerDisplayIdentities(user.companyId, customers.filter(customer => ids.has(customer.id)), {
      deferProvider: task => after(async () => { await task; }),
    });
    return NextResponse.json({ cards, canDeleteCard: authorizationService.hasPermission(user, M1MUserPermission.EDIT_CRM) }, {
      headers: { "Server-Timing": `total;dur=${Date.now() - startedAt}` },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Não foi possível carregar o CRM.' }, {
      status: error instanceof AuthorizationError ? error.statusCode : 500,
    });
  }
}
