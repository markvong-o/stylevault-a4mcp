import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/nav/Navbar";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RetailZero: Auth0 Agentic Security Demo",
  description: "See how Auth0 secures two parallel AI commerce paths to RetailZero: ChatGPT Apps via MCP and Gemini via UCP.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geistMono.variable} antialiased flex flex-col h-screen`}>
        <Navbar />
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
      </body>
    </html>
  );
}
