import type { CompletionResult, ToolCall } from "../adapters";
import {
  type Assertion,
  type ExpectNoTool,
  type ExpectOneOf,
  type ExpectTool,
  matchesSubset,
} from "./matchers";

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
    case "oneOf":
      return scoreExpectOneOf(assertion, result);
    case "noTool":
      return scoreExpectNoTool(assertion, result);
  }
}

function scoreExpectTool(assertion: ExpectTool, result: CompletionResult): AssertionResult {
  const matches = result.toolCalls.filter((call) => call.name === assertion.tool);
  if (matches.length === 0) {
    return fail(assertion, `expected ${assertion.tool}, got ${describeCalls(result.toolCalls)}`);
  }
  if (assertion.args && !matches.some((call) => matchesSubset(assertion.args, call.arguments))) {
    return fail(
      assertion,
      `called ${assertion.tool}, but args mismatch — expected to include ${stringify(assertion.args)}, got ${stringify(matches[0]?.arguments)}`,
    );
  }
  return pass(assertion, `called ${assertion.tool}`);
}

function scoreExpectOneOf(assertion: ExpectOneOf, result: CompletionResult): AssertionResult {
  const called = result.toolCalls.map((call) => call.name);
  const list = assertion.tools.join(", ");
  return assertion.tools.some((tool) => called.includes(tool))
    ? pass(assertion, `called one of [${list}]`)
    : fail(assertion, `expected one of [${list}], got ${describeCalls(result.toolCalls)}`);
}

function scoreExpectNoTool(assertion: ExpectNoTool, result: CompletionResult): AssertionResult {
  return result.toolCalls.length === 0
    ? pass(assertion, "called no tool")
    : fail(assertion, `expected no tool call, got ${describeCalls(result.toolCalls)}`);
}

function pass(assertion: Assertion, message: string): AssertionResult {
  return { assertion, passed: true, message };
}

function fail(assertion: Assertion, message: string): AssertionResult {
  return { assertion, passed: false, message };
}

function describeCalls(calls: ToolCall[]): string {
  return calls.length === 0 ? "no tool call" : calls.map((call) => call.name).join(", ");
}

function stringify(value: unknown): string {
  return JSON.stringify(value) ?? "undefined";
}
