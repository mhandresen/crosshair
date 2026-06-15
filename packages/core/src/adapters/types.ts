import type { DiscoveredTool } from "../client";

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ModelMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CompletionRequest {
  system?: string;
  messages: ModelMessage[];
  tools: DiscoveredTool[];
  temperature?: number;
  maxTokens?: number;
}

export interface CompletionResult {
  toolCalls: ToolCall[];
  text: string;
  stopReason: string;
  // Provider-native response, retained for debugging and for recording fixtures.
  raw?: unknown;
}

export interface ModelAdapter {
  readonly provider: string;
  readonly model: string;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}