"use client";

import React from "react";
import { DemoProvider } from "@/lib/demo-context";
import { DemoContent } from "./DemoContent";

export function DemoShell() {
  return (
    <DemoProvider>
      <DemoContent />
    </DemoProvider>
  );
}
