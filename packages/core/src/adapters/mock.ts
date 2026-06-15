import type { CompletionRequest, CompletionResult, ModelAdapter } from "./types";

export type MockResponder = (
  request: CompletionRequest,
) => CompletionResult | Promise<CompletionResult>;

export interface MockAdapterOptions {
  model?: string;
  respond: MockResponder;
}

export class MockAdapter implements ModelAdapter {
  readonly provider = "mock";
  readonly model: string;
  private readonly responder: MockResponder;

  constructor(options: MockAdapterOptions) {
    this.model = options.model ?? "mock-model";
    this.responder = options.respond;
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    return this.responder(request);
  }
}

export function callsTool(name: string, args: Record<string, unknown> = {}): CompletionResult {
  return { toolCalls: [{ name, arguments: args }], text: "", stopReason: "tool_use" };
}

export function callsNoTool(text = ""): CompletionResult {
  return { toolCalls: [], text, stopReason: "end_turn" };
}
