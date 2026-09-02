import {
  companyService,
} from "@/services/company.service";
import {
  companyProfileService,
} from "@/services/company-profile.service";
import {
  sectorService,
} from "@/services/sector.service";
import {
  sectorUserService,
} from "@/services/sector-user.service";
import {
  sectorScheduleService,
} from "@/services/sector-schedule.service";
import {
  paymentSettingsService,
} from "@/services/payment-settings.service";

export type SectorContextSchedule = {
  dayOfWeek: string;
  enabled: boolean;
  allDay: boolean;
  openingTime: string | null;
  closingTime: string | null;
  secondOpeningTime: string | null;
  secondClosingTime: string | null;
};

export type SectorContextPaymentSettings = {
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
};

export type SectorContextResponsible = {
  id: string;
  name: string;
  displayName: string | null;
  email: string;
  jobTitle: string | null;
  phone: string | null;
};

export type SectorContext = {
  company: {
    id: string;
    name: string;
    segment: string | null;
    presentation: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    website: string | null;
    instagram: string | null;
    outOfHoursMessage: string | null;
    humanReturnMode:
      | "IMMEDIATE"
      | "NEXT_CONVERSATION"
      | "MANUAL";
    humanClosingMessage: string | null;
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
  sector: {
    id: string;
    name: string;
    description: string | null;
    knowledge: string | null;
    active: boolean;
    sortOrder: number;
  };
  responsibles: SectorContextResponsible[];
  schedule: {
    source: "COMPANY" | "SECTOR";
    schedules: SectorContextSchedule[];
  };
  paymentSettings: SectorContextPaymentSettings | null;
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

export const contextBuilderService = {
  async buildSectorContext(
    companyId: string,
    sectorId: string,
  ): Promise<SectorContext> {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    const normalizedSectorId =
      requireText(
        sectorId,
        "Setor",
      );

    const [
      company,
      knowledgeProfile,
      sector,
      sectorUsers,
      scheduleData,
      paymentSettings,
    ] = await Promise.all([
      companyService.getCompanyProfile(
        normalizedCompanyId,
      ),
      companyProfileService.getCompanyProfile(
        normalizedCompanyId,
      ),
      sectorService.getSector(
        normalizedCompanyId,
        normalizedSectorId,
      ),
      sectorUserService.getSectorUsers(
        normalizedCompanyId,
        normalizedSectorId,
      ),
      sectorScheduleService.getSchedules(
        normalizedCompanyId,
        normalizedSectorId,
      ),
      paymentSettingsService.getPaymentSettings(
        normalizedCompanyId,
      ),
    ]);

    if (!sector.active) {
      throw new Error(
        "O setor informado está inativo.",
      );
    }

    const responsibles =
      sectorUsers.users
        .filter(
          (user) =>
            user.assigned &&
            user.active,
        )
        .map((user) => ({
          id: user.id,
          name: user.name,
          displayName:
            user.displayName,
          email: user.email,
          jobTitle:
            user.jobTitle,
          phone: user.phone,
        }));

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
        city: company.city,
        state: company.state,
        zipCode:
          company.zipCode,
        phone: company.phone,
        whatsapp:
          company.whatsapp,
        email: company.email,
        website:
          company.website,
        instagram:
          company.instagram,
        outOfHoursMessage:
          company.outOfHoursMessage,
        humanReturnMode:
          company.humanReturnMode,
        humanClosingMessage:
          company.humanClosingMessage,
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
      sector: {
        id: sector.id,
        name: sector.name,
        description:
          sector.description,
        knowledge:
          sector.knowledge,
        active:
          sector.active,
        sortOrder:
          sector.sortOrder,
      },
      responsibles,
      schedule: {
        source: scheduleData.scheduleSource,
        schedules: scheduleData.schedules.flatMap(
          (schedule) =>
            schedule
              ? [
                  {
                    dayOfWeek: schedule.dayOfWeek,
                    enabled: schedule.enabled,
                    allDay: schedule.allDay,
                    openingTime: schedule.openingTime,
                    closingTime: schedule.closingTime,
                    secondOpeningTime: schedule.secondOpeningTime,
                    secondClosingTime: schedule.secondClosingTime,
                  },
                ]
              : [],
        ),
      },
      paymentSettings: paymentSettings
        ? {
            acceptsPix: paymentSettings.acceptsPix,
            acceptsCash: paymentSettings.acceptsCash,
            acceptsCreditCard: paymentSettings.acceptsCreditCard,
            acceptsDebitCard: paymentSettings.acceptsDebitCard,
            acceptsBankSlip: paymentSettings.acceptsBankSlip,
            acceptsBankTransfer: paymentSettings.acceptsBankTransfer,
            pixKeyType: paymentSettings.pixKeyType,
            pixKey: paymentSettings.pixKey,
            pixHolderName: paymentSettings.pixHolderName,
            bankName: paymentSettings.bankName,
            bankAgency: paymentSettings.bankAgency,
            bankAccount: paymentSettings.bankAccount,
            bankAccountType: paymentSettings.bankAccountType,
            maxInstallments: paymentSettings.maxInstallments,
            installmentInterest: paymentSettings.installmentInterest,
            paymentDeadline: paymentSettings.paymentDeadline,
            receiptInstructions: paymentSettings.receiptInstructions,
            billingRules: paymentSettings.billingRules,
            additionalInformation: paymentSettings.additionalInformation,
          }
        : null,
    };
  },
};
