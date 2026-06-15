import { z } from "zod";

export const DEFAULT_SAMPLES = 5;
export const DEFAULT_THRESHOLD = 4;

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

const samplingSchema = z.object({
  samples: z.number().int().positive().optional(),
  threshold: z.number().int().positive().optional(),
});

const caseSchema = z.object({
  name: z.string(),
  prompt: z.string(),
  system: z.string().optional(),
  assertions: z.array(assertionSchema).min(1),
  sampling: samplingSchema.optional(),
});

export const configSchema = z
  .object({
    server: serverSchema,
    model: z.string().optional(),
    sampling: samplingSchema.optional(),
    cases: z.array(caseSchema).min(1),
  })
  .superRefine((config, ctx) => {
    // Threshold can't exceed samples — a case that can never pass is a config bug,
    // caught here with a precise path rather than producing confusing 0/N results.
    const globalSamples = config.sampling?.samples ?? DEFAULT_SAMPLES;
    config.cases.forEach((testCase, i) => {
      const samples = testCase.sampling?.samples ?? config.sampling?.samples ?? DEFAULT_SAMPLES;
      const threshold = testCase.sampling?.threshold ?? config.sampling?.threshold ?? DEFAULT_THRESHOLD;
      if (threshold > samples) {
        ctx.addIssue({
          code: "custom",
          path: ["cases", i, "sampling", "threshold"],
          message: `threshold (${threshold}) cannot exceed samples (${samples})`,
        });
      }
    });
    void globalSamples;
  });

export type CrosshairConfig = z.infer<typeof configSchema>;