"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import CentralPendencias from "./CentralPendencias";

type MenuItem = {
  label: string;
  href?: string;
  disabled?: boolean;
  icon:
    | "overview"
    | "conversations"
    | "contacts"
    | "settings";
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    title: "Geral",
    items: [
      {
        label: "Dashboard",
        disabled: true,
        icon: "overview",
      },
    ],
  },
  {
    title: "Atendimento",
    items: [
      {
        label: "Conversas",
        href: "/",
        icon: "conversations",
      },
      {
        label: "Contatos",
        href: "/clientes",
        icon: "contacts",
      },
    ],
  },
  {
    title: "Administração",
    items: [
      {
        label: "Configurações",
        href: "/configuracoes",
        icon: "settings",
      },
    ],
  },
];

function MenuIcon({
  type,
}: {
  type: MenuItem["icon"];
}) {
  const className =
    "h-[18px] w-[18px] shrink-0";

  if (type === "overview") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="14" y="14" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (type === "conversations") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <path
          d="M5.5 5.5h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7.8L6 20v-3.5h-.5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 9h9M7.5 12.5h6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "contacts") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <circle
          cx="12"
          cy="8"
          r="3.5"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M5.5 19c.7-3.2 3-5 6.5-5s5.8 1.8 6.5 5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="12"
        cy="12"
        r="3.2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M19.4 13.7a7.8 7.8 0 0 0 0-3.4l2-1.5-2-3.4-2.4 1a7.5 7.5 0 0 0-3-1.7L13.7 2h-3.9l-.4 2.7a7.5 7.5 0 0 0-3 1.7l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 3.4l-2 1.5 2 3.4 2.4-1a7.5 7.5 0 0 0 3 1.7l.4 2.7h3.9l.4-2.7a7.5 7.5 0 0 0 3-1.7l2.4 1 2-3.4-2.1-1.5Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function isItemActive(
  pathname: string,
  href?: string,
) {
  if (!href) {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-black/10 bg-white">
      <div className="border-b border-black/10 px-5 py-5">
        <p className="text-xl font-bold tracking-[-0.02em] text-orange-600">
          M1M Connect
        </p>

        <p className="mt-1 text-xs font-medium text-black/45">
          Marketing1Minuto
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {menuSections.map((section) => (
            <section key={section.title}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-black/35">
                {section.title}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const active =
                    isItemActive(
                      pathname,
                      item.href,
                    );

                  const baseClassName =
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition";

                  if (
                    item.disabled ||
                    !item.href
                  ) {
                    return (
                      <div
                        key={item.label}
                        aria-disabled="true"
                        title="Disponível em breve"
                        className={`${baseClassName} cursor-not-allowed text-black/30`}
                      >
                        <MenuIcon
                          type={item.icon}
                        />

                        <span className="min-w-0 flex-1">
                          {item.label}
                        </span>

                        <span className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black/30">
                          Em breve
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={
                        active
                          ? `${baseClassName} bg-black/[0.07] font-semibold text-black`
                          : `${baseClassName} text-black/60 hover:bg-black/[0.04] hover:text-black`
                      }
                    >
                      <MenuIcon
                        type={item.icon}
                      />

                      <span>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </nav>

      <div className="border-t border-black/10">
        <CentralPendencias />
      </div>
    </aside>
  );
}