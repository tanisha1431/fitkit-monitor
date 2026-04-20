import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "FitKit Mission Control",
  description: "Internal engineering dashboard for the FitKit platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full">
        <Sidebar />
        <main className="pl-64">
          {children}
        </main>
      </body>
    </html>
  );
}
