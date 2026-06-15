import { z } from "zod";

const serverSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  cwd: z.string().optional(),
});

// Mirrors the Assertion union in scoring/matchers.ts. These two definitions meet
// at the runCase() call in the run command — if they ever drift, that call stops
// compiling, which is the drift alarm.
const assertionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("tool"),
    tool: z.string(),
    args: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({ kind: z.literal("oneOf"), tools: z.array(z.string()).min(1) }),
  z.object({ kind: z.literal("noTool") }),
]);

const caseSchema = z.object({
  name: z.string(),
  prompt: z.string(),
  system: z.string().optional(),
  assertions: z.array(assertionSchema).min(1),
});

export const configSchema = z.object({
  server: serverSchema,
  model: z.string().optional(),
  cases: z.array(caseSchema).min(1),
});

export type CrosshairConfig = z.infer<typeof configSchema>;