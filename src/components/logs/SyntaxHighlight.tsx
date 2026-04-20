import React from "react";

/**
 * Lightweight syntax highlighter for HTTP requests, JSON, and headers.
 * Mirrors the pattern from SecurityEventCard but exported for reuse.
 */

function HighlightLine({ line }: { line: string }) {
  // HTTP method + path
  const httpReq = line.match(
    /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/\S*)\s*(HTTP\/[\d.]+)?$/
  );
  if (httpReq) {
    return (
      <>
        <span className="text-amber-500 font-semibold">{httpReq[1]}</span>{" "}
        <span className="text-sky-400">{httpReq[2]}</span>
        {httpReq[3] && (
          <span className="text-foreground/30"> {httpReq[3]}</span>
        )}
      </>
    );
  }

  // HTTP status line
  const httpStatus = line.match(/^(HTTP\/[\d.]+)\s+(\d{3})\s+(.*)$/);
  if (httpStatus) {
    const code = parseInt(httpStatus[2]);
    const color =
      code < 300
        ? "text-emerald-500"
        : code < 400
          ? "text-amber-500"
          : "text-red-400";
    return (
      <>
        <span className="text-foreground/30">{httpStatus[1]}</span>{" "}
        <span className={`font-semibold ${color}`}>
          {httpStatus[2]} {httpStatus[3]}
        </span>
      </>
    );
  }

  // HTTP header (Key: Value)
  const header = line.match(/^([A-Za-z][\w-]*):(.*)$/);
  if (header && !line.trim().startsWith("{") && !line.trim().startsWith('"')) {
    return (
      <>
        <span className="text-purple-400">{header[1]}</span>
        <span className="text-foreground/30">:</span>
        <span className="text-foreground/50">{header[2]}</span>
      </>
    );
  }

  // JSON lines
  if (line.match(/^\s*[{}\[\]]/) || line.match(/^\s*"[\w_]+"\s*:/)) {
    return <>{highlightJson(line)}</>;
  }

  // Comment
  if (line.match(/^\s*\/\//)) {
    return <span className="text-foreground/25 italic">{line}</span>;
  }

  return <>{line}</>;
}

function highlightJson(line: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    const structural = remaining.match(/^([\s{}\[\],]+)/);
    if (structural) {
      nodes.push(
        <span key={key++} className="text-foreground/30">
          {structural[1]}
        </span>
      );
      remaining = remaining.slice(structural[1].length);
      continue;
    }

    const jsonKey = remaining.match(/^("[\w_\-. /]+")(\s*:\s*)/);
    if (jsonKey) {
      nodes.push(
        <span key={key++} className="text-purple-400">
          {jsonKey[1]}
        </span>
      );
      nodes.push(
        <span key={key++} className="text-foreground/30">
          {jsonKey[2]}
        </span>
      );
      remaining = remaining.slice(jsonKey[0].length);
      continue;
    }

    const str = remaining.match(/^("(?:[^"\\]|\\.)*")/);
    if (str) {
      nodes.push(
        <span key={key++} className="text-emerald-400">
          {str[1]}
        </span>
      );
      remaining = remaining.slice(str[1].length);
      continue;
    }

    const num = remaining.match(/^(-?\d+\.?\d*)/);
    if (num) {
      nodes.push(
        <span key={key++} className="text-amber-400">
          {num[1]}
        </span>
      );
      remaining = remaining.slice(num[1].length);
      continue;
    }

    const bool = remaining.match(/^(true|false|null)/);
    if (bool) {
      nodes.push(
        <span key={key++} className="text-amber-400 font-semibold">
          {bool[1]}
        </span>
      );
      remaining = remaining.slice(bool[1].length);
      continue;
    }

    const other = remaining.match(/^(\S+)/);
    if (other) {
      nodes.push(
        <span key={key++} className="text-foreground/40">
          {other[1]}
        </span>
      );
      remaining = remaining.slice(other[1].length);
      continue;
    }

    nodes.push(<span key={key++}>{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }

  return <>{nodes}</>;
}

export function SyntaxHighlight({ code }: { code: string }) {
  const lines = code.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 && "\n"}
          <HighlightLine line={line} />
        </React.Fragment>
      ))}
    </>
  );
}

export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="text-xs bg-black/[0.04] rounded p-2.5 font-mono whitespace-pre-wrap break-words mt-1 leading-relaxed">
      <SyntaxHighlight code={code} />
    </pre>
  );
}
