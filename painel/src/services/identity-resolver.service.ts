const API_URL =
  process.env.EVOLUTION_API_URL;

const API_KEY =
  process.env.EVOLUTION_API_KEY;

const DEFAULT_INSTANCE =
  process.env.INSTANCE_NAME?.trim() ||
  process.env.DEFAULT_INSTANCE?.trim() ||
  "Financeiro";

type CustomerIdentityInput = {
  name?: string | null;
  phone?: string | null;
  remoteJid?: string | null;
};

type EvolutionGroupInfo = {
  id?: string | null;
  subject?: string | null;
};

export type ResolvedCustomerIdentity = {
  displayName: string;
  displayPhone: string | null;
  isGroup: boolean;
  groupSubject: string | null;
};

const MAX_CACHE_ITEMS = 200;

const globalIdentityState =
  globalThis as typeof globalThis & {
    __m1mGroupSubjectCache?: Map<
      string,
      string
    >;
  };

const groupSubjectCache =
  globalIdentityState
    .__m1mGroupSubjectCache ??
  new Map<string, string>();

globalIdentityState
  .__m1mGroupSubjectCache =
  groupSubjectCache;

function normalizeText(
  value?: string | null,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue || null;
}

function normalizeJid(
  value?: string | null,
) {
  return (
    value
      ?.trim()
      .toLowerCase() || ""
  );
}

function extractIdentifier(
  remoteJid?: string | null,
) {
  return (
    remoteJid
      ?.split("@")[0]
      ?.replace(/\D/g, "") ||
    ""
  );
}

function isUsefulName(
  value?: string | null,
) {
  const normalizedValue =
    normalizeText(value);

  if (!normalizedValue) {
    return false;
  }

  return /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(
    normalizedValue,
  );
}

function formatBrazilianPhone(
  value?: string | null,
) {
  const digits =
    value?.replace(/\D/g, "") ||
    "";

  const normalizedDigits =
    digits.startsWith("55") &&
    digits.length >= 12
      ? digits.slice(2)
      : digits;

  if (normalizedDigits.length === 11) {
    return `(${normalizedDigits.slice(
      0,
      2,
    )}) ${normalizedDigits.slice(
      2,
      7,
    )}-${normalizedDigits.slice(7)}`;
  }

  if (normalizedDigits.length === 10) {
    return `(${normalizedDigits.slice(
      0,
      2,
    )}) ${normalizedDigits.slice(
      2,
      6,
    )}-${normalizedDigits.slice(6)}`;
  }

  return normalizeText(value);
}

function saveGroupSubject(
  groupJid: string,
  subject: string,
) {
  if (
    groupSubjectCache.has(
      groupJid,
    )
  ) {
    groupSubjectCache.delete(
      groupJid,
    );
  }

  groupSubjectCache.set(
    groupJid,
    subject,
  );

  while (
    groupSubjectCache.size >
    MAX_CACHE_ITEMS
  ) {
    const oldestKey =
      groupSubjectCache
        .keys()
        .next().value;

    if (
      typeof oldestKey !==
      "string"
    ) {
      break;
    }

    groupSubjectCache.delete(
      oldestKey,
    );
  }
}

async function getGroupSubject(
  groupJid: string,
  instanceName = DEFAULT_INSTANCE,
) {
  const normalizedGroupJid =
    normalizeJid(groupJid);

  if (
    !normalizedGroupJid ||
    !normalizedGroupJid.endsWith(
      "@g.us",
    )
  ) {
    return null;
  }

  const cached =
    groupSubjectCache.get(
      normalizedGroupJid,
    );

  if (cached) {
    return cached;
  }

  if (!API_URL || !API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `${API_URL}/group/findGroupInfos/${instanceName}?groupJid=${encodeURIComponent(
        normalizedGroupJid,
      )}`,
      {
        method: "GET",
        headers: {
          apikey: API_KEY,
        },
        cache: "no-store",
        signal:
          AbortSignal.timeout(
            3000,
          ),
      },
    );

    if (!response.ok) {
      return null;
    }

    const data =
      (await response.json()) as
        EvolutionGroupInfo;

    const subject =
      normalizeText(
        data.subject,
      );

    if (subject) {
      saveGroupSubject(
        normalizedGroupJid,
        subject,
      );
    }

    return subject;
  } catch {
    return null;
  }
}

async function resolveCustomerIdentity(
  customer: CustomerIdentityInput,
  instanceName = DEFAULT_INSTANCE,
): Promise<ResolvedCustomerIdentity> {
  const remoteJid =
    normalizeJid(
      customer.remoteJid,
    );

  const isGroup =
    remoteJid.endsWith(
      "@g.us",
    );

  const identifier =
    extractIdentifier(
      remoteJid,
    );

  if (isGroup) {
    const groupSubject =
      await getGroupSubject(
        remoteJid,
        instanceName,
      );

    return {
      displayName:
        groupSubject ||
        (isUsefulName(customer.name)
          ? customer.name!.trim()
          : null) ||
        (identifier
          ? `Grupo WhatsApp ${identifier}`
          : "Grupo do WhatsApp"),
      displayPhone: null,
      isGroup: true,
      groupSubject,
    };
  }

  const displayPhone =
    formatBrazilianPhone(
      customer.phone ||
      identifier,
    );

  return {
    displayName:
      (isUsefulName(customer.name)
        ? customer.name!.trim()
        : null) ||
      displayPhone ||
      "Cliente sem identificação",
    displayPhone,
    isGroup: false,
    groupSubject: null,
  };
}

async function enrichCustomerIdentity<
  T extends {
    customer?: CustomerIdentityInput | null;
  },
>(
  item: T,
  instanceName = DEFAULT_INSTANCE,
) {
  if (!item.customer) {
    return item;
  }

  const identity =
    await resolveCustomerIdentity(
      item.customer,
      instanceName,
    );

  return {
    ...item,
    customer: {
      ...item.customer,
      ...identity,
    },
  };
}

async function enrichCustomerIdentityList<
  T extends {
    customer?: CustomerIdentityInput | null;
  },
>(
  items: T[],
  instanceName = DEFAULT_INSTANCE,
) {
  return Promise.all(
    items.map((item) =>
      enrichCustomerIdentity(
        item,
        instanceName,
      ),
    ),
  );
}

export const identityResolverService = {
  resolveCustomerIdentity,
  enrichCustomerIdentity,
  enrichCustomerIdentityList,
};
