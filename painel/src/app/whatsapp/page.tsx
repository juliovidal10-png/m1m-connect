import ChatInbox from "@/components/chat/ChatInbox";
import Sidebar from "@/components/layout/Sidebar";

export default function WhatsAppPage() {
  return (
    <main className="h-screen overflow-hidden bg-[#f7f7f8] text-[#191919]">
      <div className="flex h-full overflow-hidden">
        <Sidebar />

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-20 shrink-0 items-center border-b border-black/5 bg-white px-6 lg:px-10">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/35">
                Atendimento
              </p>

              <h1 className="mt-1 text-xl font-bold">
                Conversas
              </h1>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-hidden">
            <ChatInbox />
          </div>
        </section>
      </div>
    </main>
  );
}