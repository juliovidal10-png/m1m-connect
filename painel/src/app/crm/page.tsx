import CrmOperacional from "@/components/crm/CrmOperacional";
import Sidebar from "@/components/layout/Sidebar";

export default function CrmPage() {
  return (
    <main className="flex min-h-screen bg-[#f7f7f8] text-[#191919]">
      <Sidebar />

      <section className="flex min-w-0 flex-1 flex-col">
        <CrmOperacional />
      </section>
    </main>
  );
}
