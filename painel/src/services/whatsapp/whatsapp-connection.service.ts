import {
  companyRepository,
} from "@/repositories/company.repository";

const API_URL =
  process.env.EVOLUTION_API_URL;

const API_KEY =
  process.env.EVOLUTION_API_KEY;

const PUBLIC_URL =
  process.env.M1M_PUBLIC_URL?.trim() ||
  "";

const WEBHOOK_SECRET =
  process.env.M1M_WEBHOOK_SECRET?.trim() ||
  "";

type UnknownRecord = Record<string, unknown>;

type ServiceResult = {
  status: number;
  body: Record<string, unknown>;
};

function isRecord(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getText(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizePublicUrl(
  value: string,
) {
  return value.replace(/\/+$/, "");
}

function buildWebhook() {
  if (!PUBLIC_URL || !WEBHOOK_SECRET) {
    return undefined;
  }

  return {
    enabled: true,
    url: `${normalizePublicUrl(
      PUBLIC_URL,
    )}/api/webhooks/evolution/messages`,
    byEvents: false,
    base64: false,
    events: ["MESSAGES_UPSERT"],
    headers: {
      "x-m1m-webhook-secret":
        WEBHOOK_SECRET,
    },
  };
}

function validateEvolutionConfig():
  ServiceResult | null {
  if (!API_URL || !API_KEY) {
    return {
      status: 500,
      body: {
        error:
          "Configuração da Evolution API não encontrada.",
      },
    };
  }

  return null;
}

function validateProductionWebhook():
  ServiceResult | null {
  if (
    process.env.NODE_ENV ===
      "production" &&
    (!PUBLIC_URL || !WEBHOOK_SECRET)
  ) {
    return {
      status: 500,
      body: {
        error:
          "Webhook seguro de produção não configurado. Defina M1M_PUBLIC_URL e M1M_WEBHOOK_SECRET.",
      },
    };
  }

  return null;
}

async function parseJson(
  response: Response,
) {
  return response.json().catch(
    () => null,
  );
}

function extractQr(value: unknown) {
  if (!isRecord(value)) {
    return {
      base64: null as string | null,
      code: null as string | null,
    };
  }

  const qrcode =
    isRecord(value.qrcode)
      ? value.qrcode
      : null;

  return {
    base64:
      getText(
        value.base64 ??
          qrcode?.base64,
      ) || null,
    code:
      getText(
        value.code ??
          qrcode?.code ??
          value.pairingCode,
      ) || null,
  };
}

function getInstanceList(
  data: unknown,
) {
  return Array.isArray(data)
    ? data
    : isRecord(data) &&
        Array.isArray(data.data)
      ? data.data
      : [];
}

function findInstance(
  data: unknown,
  instanceName: string,
) {
  const list =
    getInstanceList(data);

  return (
    list.find((item) => {
      if (!isRecord(item)) {
        return false;
      }

      const nested =
        isRecord(item.instance)
          ? item.instance
          : null;

      const name =
        getText(
          item.name ??
            item.instanceName ??
            nested?.instanceName ??
            nested?.name,
        );

      return (
        name.toLowerCase() ===
        instanceName.toLowerCase()
      );
    }) ?? null
  );
}

function normalizeState(
  value: unknown,
) {
  const raw =
    getText(value).toLowerCase();

  if (
    raw === "open" ||
    raw === "connected" ||
    raw === "online"
  ) {
    return "CONNECTED";
  }

  if (
    raw === "connecting" ||
    raw === "opening"
  ) {
    return "CONNECTING";
  }

  return "DISCONNECTED";
}

async function fetchInstances() {
  const response =
    await fetch(
      `${API_URL}/instance/fetchInstances`,
      {
        headers: {
          apikey: API_KEY!,
        },
        cache: "no-store",
      },
    );

  return {
    response,
    data:
      await parseJson(response),
  };
}

async function resolveCompany(
  companyId: string,
) {
  const company =
    await companyRepository.findById(
      companyId,
    );

  if (!company) {
    return {
      result: {
        status: 404,
        body: {
          error:
            "Empresa não encontrada.",
        },
      } satisfies ServiceResult,
      company: null,
    };
  }

  return {
    result: null,
    company,
  };
}

async function ensureInstanceName(
  companyId: string,
) {
  const resolved =
    await resolveCompany(companyId);

  if (!resolved.company) {
    return {
      result: resolved.result,
      company: null,
      instanceName: "",
    };
  }

  const company =
    resolved.company;

  let instanceName =
    company.whatsappInstanceName?.trim() ||
    "";

  if (!instanceName) {
    const baseName =
      (
        company.slug?.trim() ||
        company.id
      )
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          "",
        )
        .toLowerCase()
        .replace(
          /[^a-z0-9_-]+/g,
          "-",
        )
        .replace(
          /^-+|-+$/g,
          "",
        );

    instanceName =
      `m1m-${baseName}-${company.id
        .slice(-6)
        .toLowerCase()}`;

    const instanceOwner =
      await companyRepository
        .findByWhatsappInstanceName(
          instanceName,
        );

    if (
      instanceOwner &&
      instanceOwner.id !== companyId
    ) {
      return {
        result: {
          status: 409,
          body: {
            error:
              "Não foi possível reservar uma conexão exclusiva do WhatsApp para esta empresa.",
          },
        } satisfies ServiceResult,
        company,
        instanceName: "",
      };
    }

    await companyRepository
      .updateWhatsappInstanceName(
        companyId,
        instanceName,
      );
  }

  return {
    result: null,
    company,
    instanceName,
  };
}

export const whatsappConnectionService = {
  async connect(
    companyId: string,
  ): Promise<ServiceResult> {
    const configError =
      validateEvolutionConfig();

    if (configError) {
      return configError;
    }

    const webhookError =
      validateProductionWebhook();

    if (webhookError) {
      return webhookError;
    }

    const resolved =
      await ensureInstanceName(
        companyId,
      );

    if (
      resolved.result ||
      !resolved.company ||
      !resolved.instanceName
    ) {
      return (
        resolved.result ?? {
          status: 500,
          body: {
            error:
              "Não foi possível preparar a conexão do WhatsApp.",
          },
        }
      );
    }

    const instanceName =
      resolved.instanceName;

    const instances =
      await fetchInstances();

    if (!instances.response.ok) {
      return {
        status:
          instances.response.status,
        body: {
          error:
            "Não foi possível consultar as instâncias do WhatsApp.",
          details:
            instances.data,
        },
      };
    }

    if (
      !findInstance(
        instances.data,
        instanceName,
      )
    ) {
      const createResponse =
        await fetch(
          `${API_URL}/instance/create`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              apikey:
                API_KEY!,
            },
            body:
              JSON.stringify({
                instanceName,
                integration:
                  "WHATSAPP-BAILEYS",
                qrcode: true,
                ...(buildWebhook()
                  ? {
                      webhook:
                        buildWebhook(),
                    }
                  : {}),
              }),
            cache: "no-store",
          },
        );

      const createData =
        await parseJson(
          createResponse,
        );

      if (!createResponse.ok) {
        return {
          status:
            createResponse.status,
          body: {
            error:
              "Não foi possível criar a conexão do WhatsApp.",
            details:
              createData,
          },
        };
      }

      return {
        status: 200,
        body: {
          instanceName,
          created: true,
          ...extractQr(
            createData,
          ),
          raw:
            createData,
        },
      };
    }

    const connectResponse =
      await fetch(
        `${API_URL}/instance/connect/${encodeURIComponent(
          instanceName,
        )}`,
        {
          method: "GET",
          headers: {
            apikey:
              API_KEY!,
          },
          cache: "no-store",
        },
      );

    const connectData =
      await parseJson(
        connectResponse,
      );

    if (!connectResponse.ok) {
      return {
        status:
          connectResponse.status,
        body: {
          error:
            "Não foi possível gerar o QR Code do WhatsApp.",
          details:
            connectData,
        },
      };
    }

    return {
      status: 200,
      body: {
        instanceName,
        created: false,
        ...extractQr(
          connectData,
        ),
        raw:
          connectData,
      },
    };
  },

  async getStatus(
    companyId: string,
  ): Promise<ServiceResult> {
    const configError =
      validateEvolutionConfig();

    if (configError) {
      return configError;
    }

    const resolved =
      await resolveCompany(
        companyId,
      );

    if (!resolved.company) {
      return resolved.result!;
    }

    const instanceName =
      resolved.company
        .whatsappInstanceName
        ?.trim();

    if (!instanceName) {
      return {
        status: 200,
        body: {
          instanceName: null,
          exists: false,
          state:
            "DISCONNECTED",
          phone: null,
          profileName: null,
        },
      };
    }

    const instances =
      await fetchInstances();

    if (!instances.response.ok) {
      return {
        status:
          instances.response.status,
        body: {
          error:
            "Não foi possível consultar a conexão do WhatsApp.",
          details:
            instances.data,
        },
      };
    }

    const instance =
      findInstance(
        instances.data,
        instanceName,
      );

    if (
      !instance ||
      !isRecord(instance)
    ) {
      return {
        status: 200,
        body: {
          instanceName,
          exists: false,
          state:
            "DISCONNECTED",
          phone: null,
          profileName: null,
        },
      };
    }

    const nested =
      isRecord(instance.instance)
        ? instance.instance
        : null;

    const state =
      normalizeState(
        instance.connectionStatus ??
          instance.state ??
          instance.status ??
          nested?.connectionStatus ??
          nested?.state ??
          nested?.status,
      );

    const owner =
      getText(
        instance.ownerJid ??
          nested?.ownerJid,
      );

    const phone =
      owner
        ? owner
            .replace(
              /@s\.whatsapp\.net$/i,
              "",
            )
            .replace(
              /\D/g,
              "",
            )
        : null;

    const profileName =
      getText(
        instance.profileName ??
          (
            isRecord(
              instance.profile,
            )
              ? instance.profile
                  .name
              : undefined
          ) ??
          nested?.profileName,
      ) || null;

    return {
      status: 200,
      body: {
        instanceName,
        exists: true,
        state,
        phone,
        profileName,
      },
    };
  },

  async disconnect(
    companyId: string,
  ): Promise<ServiceResult> {
    if (!API_URL || !API_KEY) {
      return {
        status: 500,
        body: {
          error:
            "Configuração da conexão do WhatsApp não encontrada.",
        },
      };
    }

    const resolved =
      await resolveCompany(
        companyId,
      );

    if (!resolved.company) {
      return resolved.result!;
    }

    const instanceName =
      resolved.company
        .whatsappInstanceName
        ?.trim();

    if (!instanceName) {
      return {
        status: 400,
        body: {
          error:
            "Instância do WhatsApp não configurada para esta empresa.",
        },
      };
    }

    const response =
      await fetch(
        `${API_URL}/instance/logout/${encodeURIComponent(
          instanceName,
        )}`,
        {
          method: "DELETE",
          headers: {
            apikey:
              API_KEY,
          },
          cache: "no-store",
        },
      );

    const data =
      await parseJson(response);

    if (!response.ok) {
      return {
        status:
          response.status,
        body: {
          error:
            "Não foi possível desconectar o WhatsApp.",
          details:
            data,
        },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        state:
          "DISCONNECTED",
        instanceName,
      },
    };
  },
};
