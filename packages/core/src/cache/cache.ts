import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CompletionRequest, CompletionResult, ModelAdapter } from "../adapters";

const CACHE_VERSION = 1;

export interface ResponseCache {
  get(key: string): CompletionResult[] | undefined;
  set(key: string, value: CompletionResult[]): void;
}

// The key captures every input that can change the model's answer — crucially the
// full tool definitions, so a changed description busts the cache and a stale
// answer can never mask a regression. Assertions are deliberately absent: changing
// an expectation re-scores cached completions for free.
export function requestCacheKey(adapter: ModelAdapter, request: CompletionRequest): string {
  const payload = stableStringify({
    v: CACHE_VERSION,
    provider: adapter.provider,
    model: adapter.model,
    temperature: request.temperature,
    maxTokens: request.maxTokens,
    system: request.system,
    messages: request.messages,
    tools: request.tools,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export class MemoryResponseCache implements ResponseCache {
  private readonly store = new Map<string, CompletionResult[]>();
  get(key: string): CompletionResult[] | undefined {
    return this.store.get(key);
  }
  set(key: string, value: CompletionResult[]): void {
    this.store.set(key, value);
  }
}

interface CacheFile {
  v: number;
  results: CompletionResult[];
}

export class FileResponseCache implements ResponseCache {
  constructor(private readonly dir = join(process.cwd(), ".crosshair", "cache")) {}

  get(key: string): CompletionResult[] | undefined {
    const file = join(this.dir, `${key}.json`);
    if (!existsSync(file)) return undefined;
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as CacheFile;
      // A version mismatch invalidates rather than replaying a stale-shaped entry.
      return parsed.v === CACHE_VERSION ? parsed.results : undefined;
    } catch {
      return undefined; // a corrupt entry is a miss, never a crash
    }
  }

  set(key: string, value: CompletionResult[]): void {
    mkdirSync(this.dir, { recursive: true });
    const payload: CacheFile = { v: CACHE_VERSION, results: value };
    writeFileSync(join(this.dir, `${key}.json`), JSON.stringify(payload));
  }
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(obj).sort().map((k) => [k, sortKeys(obj[k])]));
  }
  return value;
}