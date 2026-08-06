import ClientsPageContent from "@/components/clients/ClientsPageContent";
import Sidebar from "@/components/layout/Sidebar";

export default function ClientsPage() {
  return (
    <main className="flex min-h-screen bg-[#f7f7f8] text-[#191919]">
      <Sidebar />

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center border-b border-black/5 bg-white px-6 lg:px-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/35">
              Atendimento
            </p>

            <h1 className="mt-1 text-xl font-bold">
              Contatos
            </h1>
          </div>
        </header>

        <ClientsPageContent />
      </section>
    </main>
  );
}
