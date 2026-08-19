import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  lookup,
} from "node:dns/promises";
import {
  isIP,
} from "node:net";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";

export const runtime = "nodejs";

const REQUEST_TIMEOUT_MS = 7000;
const MAX_HTML_BYTES = 1_500_000;
const MAX_REDIRECTS = 5;

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
}

function getMetaContent(
  html: string,
  names: string[],
) {
  for (const name of names) {
    const escaped = name.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,
        "i",
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
        "i",
      ),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);

      if (match?.[1]) {
        return decodeHtml(match[1]);
      }
    }
  }

  return "";
}

function getTitle(html: string) {
  const ogTitle = getMetaContent(
    html,
    ["og:title", "twitter:title"],
  );

  if (ogTitle) {
    return ogTitle;
  }

  const titleMatch = html.match(
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  );

  return titleMatch?.[1]
    ? decodeHtml(
        titleMatch[1].replace(
          /\s+/g,
          " ",
        ),
      )
    : "";
}

function isPrivateIpv4(ip: string) {
  const parts = ip
    .split(".")
    .map(Number);

  if (parts.length !== 4) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 &&
      b >= 16 &&
      b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIpv6(ip: string) {
  const normalized =
    ip.toLowerCase();

  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

function isPrivateIp(ip: string) {
  const family = isIP(ip);

  if (family === 4) {
    return isPrivateIpv4(ip);
  }

  if (family === 6) {
    return isPrivateIpv6(ip);
  }

  return true;
}

async function assertPublicUrl(
  url: URL,
) {
  if (
    url.protocol !== "http:" &&
    url.protocol !== "https:"
  ) {
    throw new Error(
      "Protocolo não permitido.",
    );
  }

  const hostname =
    url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(
      ".localhost",
    )
  ) {
    throw new Error(
      "Endereço local não permitido.",
    );
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(
        "Endereço privado não permitido.",
      );
    }

    return;
  }

  const addresses =
    await lookup(hostname, {
      all: true,
      verbatim: true,
    });

  if (
    addresses.length === 0 ||
    addresses.some((entry) =>
      isPrivateIp(entry.address),
    )
  ) {
    throw new Error(
      "Destino privado não permitido.",
    );
  }
}

function resolveUrl(
  value: string,
  baseUrl: URL,
) {
  if (!value) {
    return null;
  }

  try {
    return new URL(
      value,
      baseUrl,
    ).toString();
  } catch {
    return null;
  }
}

async function fetchPublicHtml(
  initialUrl: URL,
  signal: AbortSignal,
) {
  let currentUrl =
    initialUrl;

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    await assertPublicUrl(
      currentUrl,
    );

    const response =
      await fetch(
        currentUrl,
        {
          method: "GET",
          redirect: "manual",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; M1MConnectPreview/1.0)",
            Accept:
              "text/html,application/xhtml+xml",
          },
          signal,
          cache:
            "force-cache",
          next: {
            revalidate: 3600,
          },
        },
      );

    if (
      response.status >= 300 &&
      response.status < 400
    ) {
      const location =
        response.headers.get(
          "location",
        );

      if (!location) {
        return response;
      }

      if (
        redirectCount >=
        MAX_REDIRECTS
      ) {
        throw new Error(
          "Limite de redirecionamentos excedido.",
        );
      }

      currentUrl =
        new URL(
          location,
          currentUrl,
        );

      continue;
    }

    return response;
  }

  throw new Error(
    "Redirecionamento inválido.",
  );
}

export async function GET(
  request: NextRequest,
) {
  try {
    await getAuthenticatedCompanyId();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Não autorizado.",
      },
      {
        status: 401,
      },
    );
  }

  const rawUrl =
    request.nextUrl.searchParams.get(
      "url",
    );

  if (!rawUrl) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "URL não informada.",
      },
      {
        status: 400,
      },
    );
  }

  let targetUrl: URL;

  try {
    targetUrl =
      new URL(rawUrl);

    await assertPublicUrl(
      targetUrl,
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "URL inválida ou não permitida.",
      },
      {
        status: 400,
      },
    );
  }

  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

  try {
    const response =
      await fetchPublicHtml(
        targetUrl,
        controller.signal,
      );

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
        },
        {
          status: 200,
        },
      );
    }

    const finalUrl =
      new URL(
        response.url ||
          targetUrl.toString(),
      );

    await assertPublicUrl(
      finalUrl,
    );

    const contentType =
      response.headers.get(
        "content-type",
      ) || "";

    if (
      !contentType.includes(
        "text/html",
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
        },
        {
          status: 200,
        },
      );
    }

    const declaredLength =
      Number(
        response.headers.get(
          "content-length",
        ) || 0,
      );

    if (
      declaredLength >
      MAX_HTML_BYTES
    ) {
      return NextResponse.json(
        {
          ok: false,
        },
        {
          status: 200,
        },
      );
    }

    const html =
      (await response.text()).slice(
        0,
        MAX_HTML_BYTES,
      );

    const title =
      getTitle(html);

    const description =
      getMetaContent(
        html,
        [
          "og:description",
          "twitter:description",
          "description",
        ],
      );

    const siteName =
      getMetaContent(
        html,
        ["og:site_name"],
      ) ||
      finalUrl.hostname.replace(
        /^www\./i,
        "",
      );

    const imageValue =
      getMetaContent(
        html,
        [
          "og:image:secure_url",
          "og:image",
          "twitter:image",
          "twitter:image:src",
        ],
      );

    const image =
      resolveUrl(
        imageValue,
        finalUrl,
      );

    return NextResponse.json(
      {
        ok:
          Boolean(
            title ||
              description ||
              image,
          ),
        url:
          finalUrl.toString(),
        title:
          title || null,
        description:
          description || null,
        siteName:
          siteName || null,
        image,
      },
      {
        headers: {
          "Cache-Control":
            "private, max-age=3600",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 200,
      },
    );
  } finally {
    clearTimeout(
      timeoutId,
    );
  }
}