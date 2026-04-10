import { DemoShell } from "@/components/demo/DemoShell";
export function generateStaticParams() {
  return [
    { slug: ["chatgpt"] },
    { slug: ["gemini"] },
    { slug: ["closing"] },
  ];
}
export default function DemoPage() { return <DemoShell />; }
