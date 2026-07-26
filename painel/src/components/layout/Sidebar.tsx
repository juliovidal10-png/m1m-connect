export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-orange-600">
          M1M Connect
        </h1>

        <p className="text-sm text-gray-500">
          Marketing1Minuto
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-orange-50">
          🏠 Visão Geral
        </button>

        <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-orange-50">
          💬 Conversas
        </button>

        <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-orange-50">
          👥 Contatos
        </button>

        <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-orange-50">
          📱 WhatsApp
        </button>

        <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-orange-50">
          ⚙️ Configurações
        </button>
      </nav>
    </aside>
  );
}