/**
 * CLI helpers for setup scripts: prompts, spinners, and colored output.
 */

import prompts from "prompts";
import chalk from "chalk";
import ora, { type Ora } from "ora";

// ── Colors and formatting ───────────────────────────────────

export const c = {
  title: (s: string) => chalk.bold.cyan(s),
  success: (s: string) => chalk.green(s),
  warn: (s: string) => chalk.yellow(s),
  error: (s: string) => chalk.red(s),
  dim: (s: string) => chalk.dim(s),
  bold: (s: string) => chalk.bold(s),
  url: (s: string) => chalk.underline.blue(s),
  key: (s: string) => chalk.magenta(s),
};

export function banner(title: string, subtitle?: string) {
  console.log();
  console.log(c.title(`  ${title}`));
  if (subtitle) console.log(c.dim(`  ${subtitle}`));
  console.log();
}

export function step(n: number, label: string) {
  console.log(c.bold(`\n  Step ${n}: ${label}`));
  console.log(c.dim("  " + "-".repeat(40)));
}

export function done(msg: string) {
  console.log(`  ${chalk.green("+")} ${msg}`);
}

export function info(msg: string) {
  console.log(`  ${chalk.blue("i")} ${msg}`);
}

export function warn(msg: string) {
  console.log(`  ${chalk.yellow("!")} ${msg}`);
}

export function fail(msg: string) {
  console.log(`  ${chalk.red("x")} ${msg}`);
}

// ── Spinners ────────────────────────────────────────────────

export function spin(text: string): Ora {
  return ora({ text: `  ${text}`, indent: 0 }).start();
}

// ── Prompts ─────────────────────────────────────────────────

export async function ask(message: string, initial?: string): Promise<string> {
  const { value } = await prompts({
    type: "text",
    name: "value",
    message,
    initial,
  });
  if (value === undefined) {
    console.log(c.dim("\n  Setup cancelled."));
    process.exit(0);
  }
  return value as string;
}

export async function askPassword(message: string): Promise<string> {
  const { value } = await prompts({
    type: "password",
    name: "value",
    message,
  });
  if (value === undefined) {
    console.log(c.dim("\n  Setup cancelled."));
    process.exit(0);
  }
  return value as string;
}

export async function confirm(message: string, initial = true): Promise<boolean> {
  const { value } = await prompts({
    type: "confirm",
    name: "value",
    message,
    initial,
  });
  return value as boolean;
}

export async function select<T extends string>(
  message: string,
  choices: Array<{ title: string; value: T; description?: string }>
): Promise<T> {
  const { value } = await prompts({
    type: "select",
    name: "value",
    message,
    choices,
  });
  if (value === undefined) {
    console.log(c.dim("\n  Setup cancelled."));
    process.exit(0);
  }
  return value;
}

// ── Summary box ─────────────────────────────────────────────

export function summaryBox(title: string, items: Array<[string, string]>) {
  console.log();
  console.log(c.bold(`  ${title}`));
  const maxKey = Math.max(...items.map(([k]) => k.length));
  for (const [key, val] of items) {
    console.log(`  ${c.dim(key.padEnd(maxKey + 2))}${val}`);
  }
  console.log();
}
