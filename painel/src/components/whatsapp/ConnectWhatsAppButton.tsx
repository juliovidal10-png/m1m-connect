"use client";

import { useState } from "react";
import ConnectWhatsAppModal from "./ConnectWhatsAppModal";

type ConnectWhatsAppButtonProps = {
  compact?: boolean;
};

export default function ConnectWhatsAppButton({
  compact = false,
}: ConnectWhatsAppButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          compact
            ? "rounded-xl bg-[#0A9090] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            : "rounded-xl bg-[#0A9090] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        }
      >
        {compact ? "+ Conectar WhatsApp" : "Conectar WhatsApp"}
      </button>

      <ConnectWhatsAppModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}