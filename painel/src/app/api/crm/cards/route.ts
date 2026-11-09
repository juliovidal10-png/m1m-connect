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
    const authenticatedAt = Date.now();
    const ids = await crmService.visibleCustomerIds(user.companyId);
    const eligibleAt = Date.now();
    const customers = ids.size
      ? await customerService.listCustomers({ companyId: user.companyId, customerIds: [...ids] })
      : [];
    const loadedAt = Date.now();
    const cards = await enrichCustomerDisplayIdentities(user.companyId, customers.filter(customer => ids.has(customer.id)), {
      deferHints: true,
      deferProvider: task => after(async () => { await task; }),
    });
    const finishedAt = Date.now();
    return NextResponse.json({ cards, canDeleteCard: authorizationService.hasPermission(user, M1MUserPermission.EDIT_CRM) }, {
      headers: { "Server-Timing": `total;dur=${finishedAt - startedAt}, eligibility;dur=${eligibleAt - authenticatedAt}, cards;dur=${loadedAt - eligibleAt}, identity;dur=${finishedAt - loadedAt}` },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Não foi possível carregar o CRM.' }, {
      status: error instanceof AuthorizationError ? error.statusCode : 500,
    });
  }
}
