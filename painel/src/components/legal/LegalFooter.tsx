import Link from "next/link";

export default function LegalFooter() {
  return (
    <footer className="w-full px-4 pt-4 pb-2 text-center text-xs text-black/45">
      <nav className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1" aria-label="Links legais">
        <Link className="transition hover:text-[#087B7B]" href="/termos">Termos de Uso</Link>
        <span aria-hidden="true">·</span>
        <Link className="transition hover:text-[#087B7B]" href="/privacidade">Política de Privacidade</Link>
        <span aria-hidden="true">·</span>
        <Link className="transition hover:text-[#087B7B]" href="/whatsapp">WhatsApp</Link>
        <span aria-hidden="true">·</span>
        <Link className="transition hover:text-[#087B7B]" href="/lgpd">LGPD</Link>
      </nav>

    </footer>
  );
}
