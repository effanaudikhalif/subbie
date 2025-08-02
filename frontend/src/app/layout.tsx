import type { Metadata } from "next";
import { Amaranth } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const amaranth = Amaranth({
  variable: "--font-amaranth",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Subbie - Student Sublet Platform",
  description: "Find and book student sublets near you",
  icons: {
    icon: "/icons/subbie.png",
    shortcut: "/icons/subbie.png",
    apple: "/icons/subbie.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-white min-h-screen">
      <body
        className={`${amaranth.variable} antialiased min-h-screen bg-white`}
      >
        <div className="w-full min-h-screen bg-white">
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  );
}
