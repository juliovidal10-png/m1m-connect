"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type M1MPageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  showBackButton?: boolean;
  rightContent?: ReactNode;
};

export default function M1MPageHeader({
  title,
  description,
  eyebrow,
  backHref = "/dashboard",
  backLabel = "Voltar ao Painel",
  showBackButton = true,
  rightContent,
}: M1MPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {showBackButton && (
          <Link
            href={backHref}
            className="group mb-4 inline-flex items-center gap-2 text-sm font-semibold text-black/45 transition-colors duration-200 hover:text-[#087B7B]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
            >
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {backLabel}
          </Link>
        )}

        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-black/35">
            {eyebrow}
          </p>
        )}

        <h1 className="mt-1 text-2xl font-bold text-[#171717]">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/50">
            {description}
          </p>
        )}
      </div>

      {rightContent && (
        <div className="flex shrink-0 items-center gap-3">
          {rightContent}
        </div>
      )}
    </header>
  );
}
