type AutomaticOutgoingEntry = {
  expiresAt: number;
  messageId?: string;
};

type AutomaticOutgoingStore =
  Map<string, AutomaticOutgoingEntry>;

declare global {
  var m1mAutomaticOutgoingStore:
    | AutomaticOutgoingStore
    | undefined;
}

const STORE =
  globalThis.m1mAutomaticOutgoingStore ??
  new Map<string, AutomaticOutgoingEntry>();

globalThis.m1mAutomaticOutgoingStore =
  STORE;

const DEFAULT_TTL_MS = 60_000;

function normalizeText(
  value: string,
) {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function buildSignature(
  instanceName: string,
  remoteJid: string,
  text: string,
) {
  return [
    instanceName.trim(),
    remoteJid.trim(),
    normalizeText(text),
  ].join("|");
}

function buildMessageIdKey(
  instanceName: string,
  messageId: string,
) {
  return [
    "id",
    instanceName.trim(),
    messageId.trim(),
  ].join("|");
}

function cleanupExpiredEntries() {
  const now =
    Date.now();

  for (
    const [
      key,
      entry,
    ] of STORE.entries()
  ) {
    if (
      entry.expiresAt <= now
    ) {
      STORE.delete(key);
    }
  }
}

export const automaticOutgoingRegistryService = {
  registerPending(
    instanceName: string,
    remoteJid: string,
    text: string,
    ttlMs = DEFAULT_TTL_MS,
  ) {
    cleanupExpiredEntries();

    const signature =
      buildSignature(
        instanceName,
        remoteJid,
        text,
      );

    STORE.set(
      signature,
      {
        expiresAt:
          Date.now() + ttlMs,
      },
    );

    return signature;
  },

  confirmMessageId(
    signature: string,
    instanceName: string,
    messageId: string,
    ttlMs = DEFAULT_TTL_MS,
  ) {
    cleanupExpiredEntries();

    const existing =
      STORE.get(signature);

    const expiresAt =
      existing?.expiresAt ??
      Date.now() + ttlMs;

    STORE.set(
      signature,
      {
        expiresAt,
        messageId,
      },
    );

    STORE.set(
      buildMessageIdKey(
        instanceName,
        messageId,
      ),
      {
        expiresAt,
        messageId,
      },
    );
  },

  cancel(
    signature: string,
  ) {
    STORE.delete(
      signature,
    );
  },

  isAutomatic(
    instanceName: string,
    remoteJid: string,
    text: string,
    messageId: string,
  ) {
    cleanupExpiredEntries();

    if (
      messageId &&
      STORE.has(
        buildMessageIdKey(
          instanceName,
          messageId,
        ),
      )
    ) {
      return true;
    }

    if (!text) {
      return false;
    }

    return STORE.has(
      buildSignature(
        instanceName,
        remoteJid,
        text,
      ),
    );
  },
};
