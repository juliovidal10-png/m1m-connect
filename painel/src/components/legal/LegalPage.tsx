import Link from "next/link";
import LegalFooter from "@/components/legal/LegalFooter";

export default function LegalPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="h-screen overflow-y-auto bg-[#f5f6f7] text-[#171717]">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col px-4 py-8 sm:px-6">
        <header className="rounded-[28px] border border-black/[0.06] bg-white px-6 py-7 shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:px-9">
          <Link href="/login" className="text-sm font-black text-[#087B7B]">M1M Connect</Link>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em]">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-black/50">{subtitle}</p>
        </header>
        <article className="mt-5 rounded-[28px] border border-black/[0.06] bg-white px-6 py-7 text-sm leading-7 text-black/65 shadow-[0_16px_45px_rgba(15,23,42,0.05)] sm:px-9">
          {children}
        </article>
        <div className="mt-auto"><LegalFooter /></div>
      </div>
    </main>
  );
}
