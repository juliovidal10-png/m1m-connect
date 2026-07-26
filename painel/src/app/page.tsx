import Sidebar from "@/components/layout/Sidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import ConversationList from "@/components/chat/ConversationList";

export default function WhatsAppPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f8] text-[#191919]">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="flex flex-1 flex-col">
          <header className="flex h-20 items-center border-b border-black/5 bg-white px-6 lg:px-10">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/35">
                Atendimento
              </p>

              <h1 className="mt-1 text-xl font-bold">Conversas</h1>
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden">
            <ConversationList />
            <ChatWindow />
          </div>
        </section>
      </div>
    </main>
  );
}