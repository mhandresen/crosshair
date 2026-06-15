import { loadConfig } from "c12";
import type { ZodError } from "zod";
import { type CrosshairConfig, configSchema } from "./schema";

export interface LoadedConfig {
  config: CrosshairConfig;
  filepath: string;
}

export async function loadCrosshairConfig(cwd = process.cwd()): Promise<LoadedConfig> {
  const { config, configFile } = await loadConfig({ name: "crosshair", cwd });

  if (!configFile) {
    throw new Error(`No crosshair config found. Create a crosshair.config.ts in ${cwd}.`);
  }

  const parsed = configSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Invalid crosshair config (${configFile}):\n${formatZodError(parsed.error)}`);
  }

  return { config: parsed.data, filepath: configFile };
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}
