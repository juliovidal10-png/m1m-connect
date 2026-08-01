import Link from "next/link";

import UsersSettings from "@/components/config/UsersSettings";
import Sidebar from "@/components/layout/Sidebar";

export default function UsuariosPage() {
  return (
    <main className="flex min-h-screen bg-[#f7f7f8] text-[#191919]">
      <Sidebar />

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center border-b border-black/5 bg-white px-6 lg:px-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/35">
              Configurações
            </p>

            <h1 className="mt-1 text-xl font-bold">
              Usuários da Empresa
            </h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="mx-auto max-w-6xl">
            <Link
              href="/configuracoes"
              className="mb-5 inline-flex rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black/60 transition hover:border-orange-200 hover:text-orange-700"
            >
              ← Voltar para configurações
            </Link>

            <UsersSettings />
          </div>
        </div>
      </section>
    </main>
  );
}
