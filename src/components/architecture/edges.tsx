"use client";

import React, { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { InfoTooltip } from "@/components/ui/info-tooltip";

/* ─── Step Edge: an edge with a numbered badge and label ─── */

type StepEdgeData = {
  step: number;
  label?: string;
  color?: string;
  dashed?: boolean;
  tooltip?: React.ReactNode;
};

export const StepEdge = memo(function StepEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}: EdgeProps & { data?: StepEdgeData }) {
  const color = data?.color || "#94a3b8";
  const dashed = data?.dashed ?? false;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: color,
          strokeWidth: dashed ? 1.5 : 2,
          strokeDasharray: dashed ? "6 4" : undefined,
        }}
        markerEnd={`url(#marker-${id})`}
      />

      {/* Custom arrowhead marker */}
      <defs>
        <marker
          id={`marker-${id}`}
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L8,3 L0,6" fill={color} />
        </marker>
      </defs>

      {data?.step && (
        <EdgeLabelRenderer>
          <div
            className={`nodrag nopan absolute flex items-center gap-1.5 ${data.tooltip ? "pointer-events-auto" : "pointer-events-none"}`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {/* Number badge */}
            <span
              className="shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{
                backgroundColor: `${color}18`,
                color: color,
                border: `1.5px solid ${color}50`,
                backdropFilter: "blur(4px)",
              }}
            >
              {data.step}
            </span>
            {data.label && (
              <span
                className="text-[8px] font-medium whitespace-nowrap px-1.5 py-0.5 rounded"
                style={{
                  color: `${color}cc`,
                  backgroundColor: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(4px)",
                }}
              >
                {data.label}
              </span>
            )}
            {data.tooltip && (
              <InfoTooltip content={data.tooltip} />
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

/* ─── Plain edge with just a label (no step number) ─── */

export const LabelEdge = memo(function LabelEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}: EdgeProps & { data?: { label?: string; color?: string } }) {
  const color = data?.color || "#94a3b8";

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: color,
          strokeWidth: 2,
        }}
        markerEnd={`url(#marker-${id})`}
      />
      <defs>
        <marker
          id={`marker-${id}`}
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L8,3 L0,6" fill={color} />
        </marker>
      </defs>
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <span
              className="text-[8px] font-medium whitespace-nowrap px-1.5 py-0.5 rounded"
              style={{
                color: `${color}bb`,
                backgroundColor: "rgba(255,255,255,0.9)",
              }}
            >
              {data.label}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

/* ─── Edge type registry ─── */

export const edgeTypes = {
  step: StepEdge,
  label: LabelEdge,
} as const;
