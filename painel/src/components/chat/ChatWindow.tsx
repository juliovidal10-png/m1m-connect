const messages = [
  {
    id: 1,
    text: "Olá, gostaria de um orçamento.",
    sender: "customer",
    time: "10:42",
  },
  {
    id: 2,
    text: "Bom dia! Claro. Pode me explicar o que você precisa?",
    sender: "agent",
    time: "10:43",
  },
];

export default function ChatWindow() {
  return (
    <section className="flex min-h-[650px] flex-1 flex-col bg-[#f7f7f8]">
      <header className="flex h-20 items-center justify-between border-b border-black/5 bg-white px-6">
        <div>
          <h2 className="font-bold">João Silva</h2>
          <p className="mt-1 text-xs text-green-600">Online</p>
        </div>

        <button
          type="button"
          className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-black/60 transition hover:bg-black/[0.03]"
        >
          Dados do cliente
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.map((message) => {
          const isAgent = message.sender === "agent";

          return (
            <div
              key={message.id}
              className={`flex ${isAgent ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                  isAgent
                    ? "rounded-br-md bg-[#0A9090] text-white"
                    : "rounded-bl-md bg-white text-[#191919]"
                }`}
              >
                <p className="text-sm leading-6">{message.text}</p>

                <p
                  className={`mt-1 text-right text-[10px] ${
                    isAgent ? "text-white/70" : "text-black/35"
                  }`}
                >
                  {message.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="border-t border-black/5 bg-white p-4">
        <div className="flex items-end gap-3">
          <textarea
            rows={1}
            placeholder="Digite sua mensagem..."
            className="min-h-12 flex-1 resize-none rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
          />

          <button
            type="button"
            className="h-12 rounded-xl bg-[#0A9090] px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Enviar
          </button>
        </div>
      </footer>
    </section>
  );
}
