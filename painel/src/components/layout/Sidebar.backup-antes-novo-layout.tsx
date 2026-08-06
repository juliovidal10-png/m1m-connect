import Link from "next/link";

import CentralPendencias from "./CentralPendencias";

const menuItems = [
  {
    label: "Visão Geral",
    href: "/",
  },
  {
    label: "Conversas",
    href: "/",
  },
  {
    label: "Contatos",
    href: "/",
  },
  {
    label: "WhatsApp",
    href: "/whatsapp",
  },
  {
    label: "Configurações",
    href: "/configuracoes",
  },
];

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b p-6">
        <h1 className="text-2xl font-bold text-orange-600">
          M1M Connect
        </h1>

        <p className="text-sm text-gray-500">
          Marketing1Minuto
        </p>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {menuItems.map((item) => (
          <Link
            key={`${item.label}-${item.href}`}
            href={item.href}
            className="block w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-orange-50 hover:text-orange-700"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <CentralPendencias />
    </aside>
  );
}
