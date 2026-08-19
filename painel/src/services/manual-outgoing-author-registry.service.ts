type ManualOutgoingAuthor = {
  userId: string;
  displayName: string;
  createdAt: number;
};

const TTL_MS = 10 * 60 * 1000;

const globalRegistry =
  globalThis as typeof globalThis & {
    __m1mManualOutgoingAuthors?: Map<
      string,
      ManualOutgoingAuthor
    >;
  };

const registry =
  globalRegistry.__m1mManualOutgoingAuthors ??
  new Map<string, ManualOutgoingAuthor>();

globalRegistry.__m1mManualOutgoingAuthors =
  registry;

function makeKey(
  instanceName: string,
  evolutionMessageId: string,
) {
  return `${instanceName.trim()}::${evolutionMessageId.trim()}`;
}

function cleanup() {
  const now = Date.now();

  for (const [registryKey, value] of registry) {
    if (now - value.createdAt > TTL_MS) {
      registry.delete(registryKey);
    }
  }
}

export const manualOutgoingAuthorRegistryService = {
  register(
    instanceName: string,
    evolutionMessageId: string,
    userId: string,
    displayName: string,
  ) {
    cleanup();

    const normalizedMessageId =
      evolutionMessageId.trim();
    const normalizedUserId =
      userId.trim();

    if (
      !normalizedMessageId ||
      !normalizedUserId
    ) {
      return;
    }

    registry.set(
      makeKey(
        instanceName,
        normalizedMessageId,
      ),
      {
        userId: normalizedUserId,
        displayName:
          displayName.trim() ||
          "Atendente",
        createdAt: Date.now(),
      },
    );
  },

  get(
    instanceName: string,
    evolutionMessageId: string,
  ) {
    cleanup();

    return (
      registry.get(
        makeKey(
          instanceName,
          evolutionMessageId,
        ),
      ) ?? null
    );
  },
};