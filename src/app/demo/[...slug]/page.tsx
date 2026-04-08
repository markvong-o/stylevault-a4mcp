import { DemoShell } from "@/components/demo/DemoShell";
export function generateStaticParams() {
  return [
    { slug: ["chatgpt"] },
    { slug: ["closing"] },
  ];
}
export default function DemoPage() { return <DemoShell />; }
