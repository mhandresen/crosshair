import type { CompletionRequest, CompletionResult, ModelAdapter, ToolCall } from "../adapters";
import type { DiscoveredTool } from "../client";
import { type Assertion, type AssertionResult, scoreCase } from "../scoring";

export interface Case {
  name: string;
  prompt: string;
  system?: string;
  assertions: Assertion[];
  sampling?: { samples?: number; threshold?: number };
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

export function buildRequest(tools: DiscoveredTool[], testCase: Case): CompletionRequest {
  return {
    system: testCase.system,
    messages: [{ role: "user", content: testCase.prompt }],
    tools,
    // Temperature 0 measures the model's *preferred* choice; sampling then measures
    // how stable that preference is (temp 0 is not fully deterministic on LLM APIs).
    temperature: 0,
  };
}

export function scoreCompletion(testCase: Case, result: CompletionResult): CaseResult {
  const assertions = scoreCase(result, testCase.assertions);
  return {
    name: testCase.name,
    passed: assertions.every((assertion) => assertion.passed),
    toolCalls: result.toolCalls,
    text: result.text,
    assertions,
  };
}

export async function runCase(
  adapter: ModelAdapter,
  tools: DiscoveredTool[],
  testCase: Case,
): Promise<CaseResult> {
  return scoreCompletion(testCase, await adapter.complete(buildRequest(tools, testCase)));
}