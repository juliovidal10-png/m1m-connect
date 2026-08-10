import DashboardOperacional from "@/components/dashboard/DashboardOperacional";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen bg-[#f7f7f8] text-[#191919]">
      <Sidebar />

      <section className="flex min-w-0 flex-1 flex-col">
        <DashboardOperacional />
      </section>
    </main>
  );
}
