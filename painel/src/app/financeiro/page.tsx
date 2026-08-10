import FinanceiroOperacional from "@/components/financeiro/FinanceiroOperacional";
import Sidebar from "@/components/layout/Sidebar";

export default function FinanceiroPage() {
  return (
    <main className="flex min-h-screen bg-[#f7f7f8] text-[#191919]">
      <Sidebar />

      <section className="flex min-w-0 flex-1 flex-col">
        <FinanceiroOperacional />
      </section>
    </main>
  );
}
