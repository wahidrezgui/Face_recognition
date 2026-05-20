import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import NavBar from "@/components/NavBar";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "GateVision Dashboard",
  description: "Real-time gate access monitoring",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark font-sans", geist.variable)} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-gv-bg text-gv-text">
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
