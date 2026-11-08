import { NextResponse } from 'next/server';
import { M1MUserPermission } from '@/generated/prisma/enums';
import { AuthorizationError, authorizationService } from '@/services/auth/authorization.service';
import { crmService } from '@/services/crm.service';
import { customerService } from '@/services/customer.service';
import { enrichCustomerDisplayIdentities } from '@/services/customer-display-identity.service';

export async function GET() {
  try {
    const user = await authorizationService.getCurrentUser();
    const ids = await crmService.visibleCustomerIds(user.companyId);
    const customers = await customerService.listCustomers({ companyId: user.companyId });
    const cards = await enrichCustomerDisplayIdentities(user.companyId, customers.filter(customer => ids.has(customer.id)));
    return NextResponse.json({ cards, canDeleteCard: authorizationService.hasPermission(user, M1MUserPermission.EDIT_CRM) });
  } catch (error) {
    return NextResponse.json({ error: 'Não foi possível carregar o CRM.' }, {
      status: error instanceof AuthorizationError ? error.statusCode : 500,
    });
  }
}
