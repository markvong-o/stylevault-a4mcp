"use client";

import React from "react";
import type { ScenarioConfig } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ScenarioSelectorProps {
  scenarios: ScenarioConfig[];
  onSelect: (id: string) => void;
}

const CLIENT_TYPE_BADGES: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
  "1st-party": { label: "1st-Party (Broad Access)", variant: "success" },
  "3rd-party-read": { label: "3rd-Party (Read Only)", variant: "warning" },
  "3rd-party-constrained": { label: "3rd-Party (Constrained)", variant: "default" },
};

export function ScenarioSelector({ scenarios, onSelect }: ScenarioSelectorProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
      <div className="text-center max-w-2xl">
        <h2 className="text-3xl font-bold text-white mb-3">Choose an AI Client Scenario</h2>
        <p className="text-lg text-muted-foreground">
          Each scenario demonstrates how Auth0 secures different levels of AI agent access to your product.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {scenarios.map((scenario) => {
          const badge = CLIENT_TYPE_BADGES[scenario.clientType] ?? { label: scenario.clientType, variant: "default" as const };
          return (
            <Card key={scenario.id} className="flex flex-col hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <CardTitle className="text-lg">{scenario.clientName}</CardTitle>
                <CardDescription>{scenario.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end">
                <div className="text-xs text-muted-foreground mb-4">
                  {scenario.scopes.length} scopes &middot; {scenario.steps.length} steps
                </div>
                <Button onClick={() => onSelect(scenario.id)} className="w-full">
                  Start Scenario
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
