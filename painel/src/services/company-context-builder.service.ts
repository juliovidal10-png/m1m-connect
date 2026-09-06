import {
  companyService,
} from "@/services/company.service";
import {
  companyProfileService,
} from "@/services/company-profile.service";
import {
  companyScheduleService,
} from "@/services/company-schedule.service";
import {
  paymentSettingsService,
} from "@/services/payment-settings.service";

export type CompanyInformationContext = {
  company: {
    id: string;
    name: string;
    segment: string | null;
    presentation: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    locationLink: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    website: string | null;
    instagram: string | null;
  };
  knowledgeProfile: {
    presentation: string | null;
    differentials: string | null;
    productsServices: string | null;
    targetAudience: string | null;
    serviceArea: string | null;
    companyPolicies: string | null;
    importantInformation: string | null;
    frequentlyAskedQuestions: string | null;
  } | null;
  schedules: Array<{
    dayOfWeek: string;
    enabled: boolean;
    allDay: boolean;
    openingTime: string | null;
    closingTime: string | null;
    secondOpeningTime: string | null;
    secondClosingTime: string | null;
  }>;
  paymentSettings: {
    acceptsPix: boolean;
    acceptsCash: boolean;
    acceptsCreditCard: boolean;
    acceptsDebitCard: boolean;
    acceptsBankSlip: boolean;
    acceptsBankTransfer: boolean;
    pixKeyType: string | null;
    pixKey: string | null;
    pixHolderName: string | null;
    bankName: string | null;
    bankAgency: string | null;
    bankAccount: string | null;
    bankAccountType: string | null;
    maxInstallments: number | null;
    installmentInterest: string | null;
    paymentDeadline: string | null;
    receiptInstructions: string | null;
    billingRules: string | null;
    additionalInformation: string | null;
  } | null;
};

function requireText(
  value: string | null | undefined,
  fieldName: string,
) {
  const normalizedValue =
    value?.trim();

  if (!normalizedValue) {
    throw new Error(
      `${fieldName} é obrigatório.`,
    );
  }

  return normalizedValue;
}

export const companyContextBuilderService = {
  async buildCompanyContext(
    companyId: string,
  ): Promise<CompanyInformationContext> {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    const [
      company,
      knowledgeProfile,
      scheduleData,
      paymentSettings,
    ] = await Promise.all([
      companyService.getCompanyProfile(
        normalizedCompanyId,
      ),
      companyProfileService.getCompanyProfile(
        normalizedCompanyId,
      ),
      companyScheduleService.getSchedules(
        normalizedCompanyId,
      ),
      paymentSettingsService.getPaymentSettings(
        normalizedCompanyId,
      ),
    ]);

    return {
      company: {
        id: company.id,
        name: company.name,
        segment:
          company.segment,
        presentation:
          company.presentation,
        address:
          company.address,
        city:
          company.city,
        state:
          company.state,
        zipCode:
          company.zipCode,
        locationLink:
          company.locationLink,
        phone:
          company.phone,
        whatsapp:
          company.whatsapp,
        email:
          company.email,
        website:
          company.website,
        instagram:
          company.instagram,
      },
      knowledgeProfile:
        knowledgeProfile
          ? {
              presentation:
                knowledgeProfile.presentation,
              differentials:
                knowledgeProfile.differentials,
              productsServices:
                knowledgeProfile.productsServices,
              targetAudience:
                knowledgeProfile.targetAudience,
              serviceArea:
                knowledgeProfile.serviceArea,
              companyPolicies:
                knowledgeProfile.companyPolicies,
              importantInformation:
                knowledgeProfile.importantInformation,
              frequentlyAskedQuestions:
                knowledgeProfile.frequentlyAskedQuestions,
            }
          : null,
      schedules:
        scheduleData.schedules.filter(
          (
            schedule,
          ): schedule is NonNullable<
            typeof schedule
          > =>
            Boolean(schedule),
        ),
      paymentSettings,
    };
  },
};
