import { Suspense } from "react";
import ClientsPageContent from "@/components/clients/ClientsPageContent";
import Sidebar from "@/components/layout/Sidebar";

export default function ClientsPage() {
  return (
    <main className="flex min-h-screen bg-[#f7f7f8] text-[#191919]">
      <Sidebar />

      <section className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={null}><ClientsPageContent /></Suspense>
      </section>
    </main>
  );
}
