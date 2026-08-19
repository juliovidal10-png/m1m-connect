"use client";

import type { ReactNode } from "react";

type M1MCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export default function M1MCard({
  icon,
  title,
  description,
  actionLabel = "Abrir →",
  onClick,
  disabled = false,
}: M1MCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group flex min-h-56 w-full flex-col rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-200 ${
        disabled
          ? "cursor-not-allowed border-black/5 opacity-45"
          : "cursor-pointer border-black/5 hover:-translate-y-0.5 hover:border-[#0A9090]/35 hover:shadow-md"
      }`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-200 ${
          disabled
            ? "bg-black/[0.025] text-black/25"
            : "bg-black/[0.035] text-black/60 group-hover:bg-[#F0F9F9] group-hover:text-[#087B7B]"
        }`}
      >
        {icon}
      </div>

      <div className="mt-5 flex-1">
        <h3
          className={`text-base font-bold transition-colors duration-200 ${
            disabled
              ? "text-black/35"
              : "text-[#171717] group-hover:text-[#087B7B]"
          }`}
        >
          {title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-black/50">
          {description}
        </p>
      </div>

      <div className="mt-5 border-t border-black/5 pt-4">
        <span
          className={`text-xs font-bold transition-colors duration-200 ${
            disabled
              ? "text-black/25"
              : "text-black/35 group-hover:text-[#087B7B]"
          }`}
        >
          {disabled ? "Em breve" : actionLabel}
        </span>
      </div>
    </button>
  );
}
