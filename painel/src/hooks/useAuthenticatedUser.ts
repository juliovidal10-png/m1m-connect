"use client";

import {
  useEffect,
  useState,
} from "react";

export type AuthenticatedUser = {
  name: string;
  email: string | null;
};

type AuthMeResponse = {
  authenticated?: boolean;
  user?: {
    name?: string | null;
    displayName?: string | null;
    email?: string | null;
  } | null;
};

function cleanText(
  value: string | null | undefined,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export function getUserInitials(
  name: string,
) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "US";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toLocaleUpperCase("pt-BR");
}

export function useAuthenticatedUser() {
  const [user, setUser] =
    useState<AuthenticatedUser | null>(null);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadUser() {
      try {
        const response = await fetch(
          "/api/auth/me",
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          setUser(null);
          return;
        }

        const result =
          (await response.json()) as AuthMeResponse;

        if (
          !result.authenticated ||
          !result.user
        ) {
          setUser(null);
          return;
        }

        const name =
          cleanText(result.user.displayName) ||
          cleanText(result.user.name) ||
          "Usuário";

        const email =
          cleanText(result.user.email) ||
          null;

        if (!controller.signal.aborted) {
          setUser({ name, email });
        }
      } catch {
        if (!controller.signal.aborted) {
          setUser(null);
        }
      }
    }

    void loadUser();

    return () => controller.abort();
  }, []);

  return user;
}
