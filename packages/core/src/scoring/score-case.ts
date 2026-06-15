import type { CompletionResult, ToolCall } from "../adapters";
import type { Assertion, ExpectTool } from "./matchers";

export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  message: string;
}

export function scoreCase(result: CompletionResult, assertions: Assertion[]): AssertionResult[] {
  return assertions.map((assertion) => scoreAssertion(assertion, result));
}

function scoreAssertion(assertion: Assertion, result: CompletionResult): AssertionResult {
  switch (assertion.kind) {
    case "tool":
      return scoreExpectTool(assertion, result);
  }
}

function scoreExpectTool(assertion: ExpectTool, result: CompletionResult): AssertionResult {
  const called = result.toolCalls.map((call) => call.name);
  const passed = called.includes(assertion.tool);
  return {
    assertion,
    passed,
    message: passed
      ? `called ${assertion.tool}`
      : `expected ${assertion.tool}, got ${describeCalls(result.toolCalls)}`,
  };
}

function describeCalls(calls: ToolCall[]): string {
  return calls.length === 0 ? "no tool call" : calls.map((call) => call.name).join(", ");
}