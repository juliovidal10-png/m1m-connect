import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CompanyAccessGate from "@/components/access/CompanyAccessGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://connect.marketing1minuto.com"),
  title: "M1M Connect",
  description: "Conecte. Atenda. Cres\u00e7a.",
  openGraph: {
    title: "M1M Connect",
    description: "Conecte. Atenda. Cres\u00e7a.",
    url: "https://connect.marketing1minuto.com",
    siteName: "M1M Connect",
    images: [
      {
        url: "/m1m-connect-og.png",
        width: 1200,
        height: 630,
        alt: "M1M Connect - Conecte. Atenda. Cres\u00e7a.",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "M1M Connect",
    description: "Conecte. Atenda. Cres\u00e7a.",
    images: ["/m1m-connect-og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}><CompanyAccessGate>{children}</CompanyAccessGate></Suspense>
      </body>
    </html>
  );
}
