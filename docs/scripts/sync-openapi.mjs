#!/usr/bin/env node
/**
 * Fetches OpenAPI JSON from a running FastAPI backend and writes docs/static/openapi.json.
 * Usage: OPENAPI_URL=http://127.0.0.1:8000/openapi.json node scripts/sync-openapi.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'static');
const outFile = join(outDir, 'openapi.json');

const url = process.env.OPENAPI_URL ?? 'http://127.0.0.1:8000/openapi.json';

async function main() {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify(json, null, 2), 'utf8');
  console.log(`Wrote ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
