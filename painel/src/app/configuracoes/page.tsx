"use client";

import { useState } from "react";

import AutomaticMessagesSettings from "@/components/config/AutomaticMessagesSettings";
import CompanySchedulesSettings from "@/components/config/CompanySchedulesSettings";
import CompanySettings from "@/components/config/CompanySettings";
import CompanyProfileSettings from "@/components/config/CompanyProfileSettings";
import HumanAttendanceSettings from "@/components/config/HumanAttendanceSettings";
import PaymentSettings from "@/components/config/PaymentSettings";
import SectorsSettings from "@/components/config/SectorsSettings";
import Sidebar from "@/components/layout/Sidebar";
import M1MCard from "@/components/m1m/M1MCard";
import M1MPageHeader from "@/components/m1m/M1MPageHeader";

type ActiveSection =
  | "overview"
  | "company"
  | "sectors"
  | "companySchedules"
  | "companyProfile"
  | "payments"
  | "automaticMessages"
  | "humanAttendance";

type SectionIconName =
  | "company"
  | "sectors"
  | "users"
  | "schedule"
  | "messages"
  | "ai"
  | "payments"
  | "human"
  | "whatsapp";

type Section = {
  id:
    | ActiveSection
    | "companyProfile"
    | "payments"
    | "humanAttendance"
    | "users"
    | "whatsapp";
  title: string;
  description: string;
  enabled: boolean;
  icon: SectionIconName;
  actionLabel: string;
};

const sections: Section[] = [
  {
    id: "company",
    title: "Empresa",
    description:
      "Dados institucionais, endereço e canais oficiais.",
    enabled: true,
    icon: "company",
    actionLabel: "Abrir →",
  },
  {
    id: "sectors",
    title: "Setores",
    description:
      "Organize departamentos, encaminhamentos e responsáveis.",
    enabled: true,
    icon: "sectors",
    actionLabel: "Abrir →",
  },
  {
    id: "users",
    title: "Usuários e Permissões",
    description:
      "Gerencie colaboradores, acessos e permissões.",
    enabled: true,
    icon: "users",
    actionLabel: "Gerenciar →",
  },
  {
    id: "companySchedules",
    title: "Horário Geral",
    description:
      "Defina os dias e horários padrão de atendimento.",
    enabled: true,
    icon: "schedule",
    actionLabel: "Abrir →",
  },
  {
    id: "automaticMessages",
    title: "Mensagens Automáticas",
    description:
      "Configure mensagens enviadas fora do expediente.",
    enabled: true,
    icon: "messages",
    actionLabel: "Abrir →",
  },
  {
    id: "companyProfile",
    title: "Conhecimento da Empresa",
    description:
      "Ensine à IA as informações essenciais do negócio.",
    enabled: true,
    icon: "ai",
    actionLabel: "Configurar →",
  },
  {
    id: "payments",
    title: "Pagamentos",
    description:
      "Formas de pagamento, condições e orientações comerciais.",
    enabled: true,
    icon: "payments",
    actionLabel: "Abrir →",
  },
  {
    id: "humanAttendance",
    title: "Atendimento Humano",
    description:
      "Defina a transição entre equipe e atendimento automático.",
    enabled: true,
    icon: "human",
    actionLabel: "Abrir →",
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    description:
      "Conecte, desconecte ou reconecte o WhatsApp da empresa.",
    enabled: true,
    icon: "whatsapp",
    actionLabel: "Gerenciar →",
  },
];

function SectionIcon({
  name,
}: {
  name: SectionIconName;
}) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-5 w-5",
    "aria-hidden": true,
  };

  if (name === "company") {
    return (
      <svg {...commonProps}>
        <path d="M4 21V5.5L12 3v18M12 8h8v13M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2" />
      </svg>
    );
  }

  if (name === "sectors") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="5" r="2.25" />
        <circle cx="6" cy="18" r="2.25" />
        <circle cx="18" cy="18" r="2.25" />
        <path d="M12 7.25v4.25M7.6 16.2 12 11.5l4.4 4.7" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg {...commonProps}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 7.5a2.5 2.5 0 1 1 0 5M16 15a5 5 0 0 1 4.5 5" />
      </svg>
    );
  }

  if (name === "schedule") {
    return (
      <svg {...commonProps}>
        <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
        <path d="M8 3.5v4M16 3.5v4M3.5 10h17M12 13v3l2 1" />
      </svg>
    );
  }

  if (name === "messages") {
    return (
      <svg {...commonProps}>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    );
  }

  if (name === "ai") {
    return (
      <svg {...commonProps}>
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M8.2 14.8A6 6 0 1 1 15.8 14.8C14.7 15.7 14 16.7 14 18h-4c0-1.3-.7-2.3-1.8-3.2Z" />
        <path d="M12 2V1M4.9 4.9 4.2 4.2M19.1 4.9l.7-.7M2 12H1M23 12h-1" />
      </svg>
    );
  }

  if (name === "payments") {
    return (
      <svg {...commonProps}>
        <rect x="3.5" y="5" width="17" height="14" rx="2" />
        <path d="M3.5 9h17M8 14h3M15.5 14h1" />
      </svg>
    );
  }

  if (name === "whatsapp") {
    return (
      <svg {...commonProps}>
        <path d="M20.5 11.7a8.5 8.5 0 0 1-12.7 7.4L3 20.5l1.5-4.6a8.5 8.5 0 1 1 16-4.2Z" />
        <path d="M8.5 7.8c.4 3.8 3.9 7.3 7.7 7.7" />
        <path d="m8.5 7.8 1.8-.7 1.1 2.6-1.2 1.1M16.2 15.5l.7-1.8-2.6-1.1-1.1 1.2" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20a7 7 0 0 1 14 0M17.5 5.5l1 1 2-2" />
    </svg>
  );
}

export default function ConfiguracoesPage() {
  const [activeSection, setActiveSection] =
    useState<ActiveSection>(
      "overview",
    );

  return (
    <main className="flex min-h-screen bg-[#f7f7f8] text-[#191919]">
      <Sidebar />

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="mx-auto max-w-6xl">
            <M1MPageHeader
              eyebrow="Configurações"
              title="Central de Configurações"
              description="Configure toda a operação da sua empresa em um único lugar."
              showBackButton={false}
            />
            {activeSection === "overview" ? (
              <>
                <div className="mt-6 rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#087B7B]">
                    Tudo em um só lugar
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-[#171717]">
                    Ajuste o M1M Connect sem complicação
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-black/50">
                    Escolha abaixo o que deseja configurar. Cada área foi organizada para ser simples, rápida e direta.
                  </p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {sections.map((section) => (
                    <M1MCard
                      key={section.title}
                      icon={
                        <SectionIcon
                          name={section.icon}
                        />
                      }
                      title={section.title}
                      description={
                        section.description
                      }
                      actionLabel={
                        section.actionLabel
                      }
                      disabled={
                        !section.enabled
                      }
                      onClick={() => {
                        if (!section.enabled) {
                          return;
                        }

                        if (
                          section.id === "users"
                        ) {
                          window.location.href =
                            "/configuracoes/usuarios";

                          return;
                        }

                        if (
                          section.id === "whatsapp"
                        ) {
                          window.location.href =
                            "/configuracoes/whatsapp";

                          return;
                        }

                        if (
                          section.id ===
                            "company" ||
                          section.id ===
                            "sectors" ||
                          section.id ===
                            "companySchedules" ||
                          section.id ===
                            "companyProfile" ||
                          section.id ===
                            "payments" ||
                          section.id ===
                            "automaticMessages" ||
                          section.id ===
                            "humanAttendance"
                        ) {
                          setActiveSection(
                            section.id,
                          );
                        }
                      }}
                    />
                  ))}
                </div>
              </>
            ) : activeSection === "sectors" ? (
              <SectorsSettings
                onBack={() =>
                  setActiveSection(
                    "overview",
                  )
                }
              />
            ) : activeSection ===
              "companySchedules" ? (
              <CompanySchedulesSettings
                onBack={() =>
                  setActiveSection(
                    "overview",
                  )
                }
              />
            ) : activeSection ===
              "companyProfile" ? (
              <CompanyProfileSettings
                onBack={() =>
                  setActiveSection(
                    "overview",
                  )
                }
              />
            ) : activeSection ===
              "payments" ? (
              <PaymentSettings
                onBack={() =>
                  setActiveSection(
                    "overview",
                  )
                }
              />
            ) : activeSection ===
              "automaticMessages" ? (
              <AutomaticMessagesSettings
                onBack={() =>
                  setActiveSection(
                    "overview",
                  )
                }
              />
            ) : activeSection ===
              "humanAttendance" ? (
              <HumanAttendanceSettings
                onBack={() =>
                  setActiveSection(
                    "overview",
                  )
                }
              />
            ) : (
              <CompanySettings
                onBack={() =>
                  setActiveSection(
                    "overview",
                  )
                }
              />
            )}          </div>
        </div>
      </section>
    </main>
  );
}
