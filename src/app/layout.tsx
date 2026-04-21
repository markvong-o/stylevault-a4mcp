import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Navbar } from "@/components/nav/Navbar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({ variable: "--font-display", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StyleVault: Auth0 Agentic Security Demo",
  description: "See how Auth0 secures two parallel AI commerce paths to StyleVault: ChatGPT Apps via MCP and Gemini via UCP.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased flex flex-col h-screen`}>
        <Navbar />
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
      </body>
    </html>
  );
}
