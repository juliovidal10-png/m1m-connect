import CentralPendencias from "./CentralPendencias";

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <CentralPendencias />

      <div className="border-b p-6">
        <h1 className="text-2xl font-bold text-orange-600">
          M1M Connect
        </h1>

        <p className="text-sm text-gray-500">
          Marketing1Minuto
        </p>
      </div>

      <nav className="flex-1 space-y-2 p-4">
        <button className="w-full rounded-lg px-4 py-3 text-left hover:bg-orange-50">
          🏠 Visão Geral
        </button>

        <button className="w-full rounded-lg px-4 py-3 text-left hover:bg-orange-50">
          💬 Conversas
        </button>

        <button className="w-full rounded-lg px-4 py-3 text-left hover:bg-orange-50">
          👥 Contatos
        </button>

        <button className="w-full rounded-lg px-4 py-3 text-left hover:bg-orange-50">
          📱 WhatsApp
        </button>

        <button className="w-full rounded-lg px-4 py-3 text-left hover:bg-orange-50">
          ⚙️ Configurações
        </button>
      </nav>
    </aside>
  );
}