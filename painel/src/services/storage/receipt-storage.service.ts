import {
  mkdir,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const LOCAL_PREFIX =
  "/payment-receipts/";

const S3_PREFIX =
  "s3://";

function getStorageMode() {
  return (
    process.env.M1M_RECEIPT_STORAGE_MODE
      ?.trim()
      .toLowerCase() || "local"
  );
}

function getS3Config() {
  const endpoint =
    process.env.M1M_STORAGE_ENDPOINT
      ?.trim();

  const region =
    process.env.M1M_STORAGE_REGION
      ?.trim() || "auto";

  const bucket =
    process.env.M1M_STORAGE_BUCKET
      ?.trim();

  const accessKeyId =
    process.env.M1M_STORAGE_ACCESS_KEY_ID
      ?.trim();

  const secretAccessKey =
    process.env.M1M_STORAGE_SECRET_ACCESS_KEY
      ?.trim();

  if (
    !bucket ||
    !accessKeyId ||
    !secretAccessKey
  ) {
    throw new Error(
      "Storage S3 não configurado. Defina M1M_STORAGE_BUCKET, M1M_STORAGE_ACCESS_KEY_ID e M1M_STORAGE_SECRET_ACCESS_KEY.",
    );
  }

  return {
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
  };
}

function getS3Client() {
  const config =
    getS3Config();

  return {
    bucket:
      config.bucket,
    client:
      new S3Client({
        region:
          config.region,
        ...(config.endpoint
          ? {
              endpoint:
                config.endpoint,
              forcePathStyle:
                process.env.M1M_STORAGE_FORCE_PATH_STYLE
                  ?.trim()
                  .toLowerCase() ===
                "true",
            }
          : {}),
        credentials: {
          accessKeyId:
            config.accessKeyId,
          secretAccessKey:
            config.secretAccessKey,
        },
      }),
  };
}

function resolveLocalPath(
  mediaUrl: string,
) {
  const normalized =
    mediaUrl.trim();

  if (
    !normalized.startsWith(
      LOCAL_PREFIX,
    )
  ) {
    throw new Error(
      "URL de comprovante local inválida.",
    );
  }

  const fileName =
    path.basename(
      normalized,
    );

  const directory =
    path.resolve(
      process.cwd(),
      "public",
      "payment-receipts",
    );

  const filePath =
    path.resolve(
      directory,
      fileName,
    );

  if (
    !filePath.startsWith(
      `${directory}${path.sep}`,
    )
  ) {
    throw new Error(
      "Caminho de comprovante inválido.",
    );
  }

  return {
    directory,
    filePath,
    fileName,
  };
}

function parseS3Url(
  mediaUrl: string,
) {
  const normalized =
    mediaUrl.trim();

  if (
    !normalized.startsWith(
      S3_PREFIX,
    )
  ) {
    throw new Error(
      "URL S3 de comprovante inválida.",
    );
  }

  const withoutScheme =
    normalized.slice(
      S3_PREFIX.length,
    );

  const slash =
    withoutScheme.indexOf("/");

  if (
    slash <= 0 ||
    slash ===
      withoutScheme.length - 1
  ) {
    throw new Error(
      "URL S3 de comprovante inválida.",
    );
  }

  return {
    bucket:
      withoutScheme.slice(
        0,
        slash,
      ),
    key:
      withoutScheme.slice(
        slash + 1,
      ),
  };
}

async function streamToBuffer(
  body: unknown,
) {
  if (
    !body ||
    typeof body !== "object" ||
    !("transformToByteArray" in body) ||
    typeof body.transformToByteArray !==
      "function"
  ) {
    throw new Error(
      "Storage não retornou conteúdo legível.",
    );
  }

  const bytes =
    await body.transformToByteArray();

  return Buffer.from(
    bytes,
  );
}

export const receiptStorageService = {
  async save(input: {
    fileName: string;
    buffer: Buffer;
    contentType?: string | null;
  }) {
    const safeFileName =
      path.basename(
        input.fileName,
      );

    if (
      getStorageMode() ===
      "s3"
    ) {
      const {
        client,
        bucket,
      } = getS3Client();

      const key =
        `payment-receipts/${safeFileName}`;

      await client.send(
        new PutObjectCommand({
          Bucket:
            bucket,
          Key:
            key,
          Body:
            input.buffer,
          ...(input.contentType
            ? {
                ContentType:
                  input.contentType,
              }
            : {}),
        }),
      );

      return {
        mediaUrl:
          `${S3_PREFIX}${bucket}/${key}`,
      };
    }

    const directory =
      path.resolve(
        process.cwd(),
        "public",
        "payment-receipts",
      );

    await mkdir(
      directory,
      {
        recursive: true,
      },
    );

    const filePath =
      path.resolve(
        directory,
        safeFileName,
      );

    if (
      !filePath.startsWith(
        `${directory}${path.sep}`,
      )
    ) {
      throw new Error(
        "Caminho de comprovante inválido.",
      );
    }

    await writeFile(
      filePath,
      input.buffer,
    );

    return {
      mediaUrl:
        `${LOCAL_PREFIX}${safeFileName}`,
    };
  },

  async read(
    mediaUrl: string,
  ) {
    const normalized =
      mediaUrl.trim();

    if (
      normalized.startsWith(
        S3_PREFIX,
      )
    ) {
      const {
        bucket,
        key,
      } = parseS3Url(
        normalized,
      );

      const {
        client,
      } = getS3Client();

      const response =
        await client.send(
          new GetObjectCommand({
            Bucket:
              bucket,
            Key:
              key,
          }),
        );

      return streamToBuffer(
        response.Body,
      );
    }

    const {
      filePath,
    } = resolveLocalPath(
      normalized,
    );

    return readFile(
      filePath,
    );
  },

  async remove(
    mediaUrl: string,
  ) {
    const normalized =
      mediaUrl.trim();

    if (
      normalized.startsWith(
        S3_PREFIX,
      )
    ) {
      const {
        bucket,
        key,
      } = parseS3Url(
        normalized,
      );

      const {
        client,
      } = getS3Client();

      await client.send(
        new DeleteObjectCommand({
          Bucket:
            bucket,
          Key:
            key,
        }),
      );

      return true;
    }

    const {
      filePath,
    } = resolveLocalPath(
      normalized,
    );

    try {
      await unlink(
        filePath,
      );

      return true;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return false;
      }

      throw error;
    }
  },

  isManagedUrl(
    mediaUrl?: string | null,
  ) {
    const normalized =
      mediaUrl?.trim();

    return Boolean(
      normalized &&
        (
          normalized.startsWith(
            LOCAL_PREFIX,
          ) ||
          normalized.startsWith(
            S3_PREFIX,
          )
        ),
    );
  },
};
