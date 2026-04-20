/**
 * Read, merge, and write .env files.
 * Preserves existing values and comments. Adds new keys.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "../../.env");

interface EnvEntry {
  key: string;
  value: string;
  comment?: string;
}

/**
 * Read the current .env file into a key-value map.
 * Returns empty object if the file doesn't exist.
 */
export function readEnv(): Record<string, string> {
  if (!existsSync(ENV_PATH)) return {};

  const content = readFileSync(ENV_PATH, "utf-8");
  const env: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }

  return env;
}

/**
 * Write entries to .env, merging with any existing content.
 * Backs up the existing file before writing.
 */
export function writeEnv(sections: Array<{ header: string; entries: EnvEntry[] }>) {
  // Back up existing .env
  if (existsSync(ENV_PATH)) {
    copyFileSync(ENV_PATH, ENV_PATH + ".backup");
  }

  const existing = readEnv();
  const lines: string[] = [];

  for (const section of sections) {
    lines.push(`# ${section.header}`);

    for (const entry of section.entries) {
      if (entry.comment) {
        lines.push(`# ${entry.comment}`);
      }
      // Use existing value if already set (don't overwrite user edits)
      const val = existing[entry.key] ?? entry.value;
      lines.push(`${entry.key}=${val}`);
    }

    lines.push("");
  }

  writeFileSync(ENV_PATH, lines.join("\n"), "utf-8");
}

/**
 * Merge new entries into an existing .env without losing anything.
 * Only adds keys that don't already exist.
 */
export function mergeEnv(entries: EnvEntry[]) {
  const existing = readEnv();
  const newEntries: EnvEntry[] = [];

  for (const entry of entries) {
    if (!(entry.key in existing)) {
      newEntries.push(entry);
    }
  }

  if (newEntries.length === 0) return;

  // Append to existing file
  let content = "";
  if (existsSync(ENV_PATH)) {
    content = readFileSync(ENV_PATH, "utf-8");
    if (!content.endsWith("\n")) content += "\n";
  }

  for (const entry of newEntries) {
    if (entry.comment) content += `# ${entry.comment}\n`;
    content += `${entry.key}=${entry.value}\n`;
  }

  writeFileSync(ENV_PATH, content, "utf-8");
}

export function envPath(): string {
  return ENV_PATH;
}
