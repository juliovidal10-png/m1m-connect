import {
  companyService,
} from "@/services/company.service";
import {
  sectorService,
} from "@/services/sector.service";
import {
  sectorUserService,
} from "@/services/sector-user.service";

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
  sector: {
    id: string;
    name: string;
    description: string | null;
    knowledge: string | null;
    active: boolean;
    sortOrder: number;
  };
  responsibles: SectorContextResponsible[];
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
      sector,
      sectorUsers,
    ] = await Promise.all([
      companyService.getCompanyProfile(
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
    };
  },
};
