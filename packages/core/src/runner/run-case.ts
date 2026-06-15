import type { ModelAdapter, ToolCall } from "../adapters";
import type { DiscoveredTool } from "../client";
import { type Assertion, type AssertionResult, scoreCase } from "../scoring";

export interface Case {
  name: string;
  prompt: string;
  system?: string;
  assertions: Assertion[];
}

export interface CaseResult {
  name: string;
  passed: boolean;
  toolCalls: ToolCall[];
  text: string;
  assertions: AssertionResult[];
}

export function defineCase(testCase: Case): Case {
  return testCase;
}

export async function runCase(
  adapter: ModelAdapter,
  tools: DiscoveredTool[],
  testCase: Case,
): Promise<CaseResult> {
  const result = await adapter.complete({
    system: testCase.system,
    messages: [{ role: "user", content: testCase.prompt }],
    tools,
    // Sampling + threshold land in Phase 3; for now, run once, deterministically.
    temperature: 0,
  });

  const assertions = scoreCase(result, testCase.assertions);

  return {
    name: testCase.name,
    passed: assertions.every((assertion) => assertion.passed),
    toolCalls: result.toolCalls,
    text: result.text,
    assertions,
  };
}