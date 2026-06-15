import Anthropic from "@anthropic-ai/sdk";
import type { DiscoveredTool } from "../client";
import type { CompletionRequest, CompletionResult, ModelAdapter, ToolCall } from "./types";

// Model IDs and pricing drift — confirm the current list at https://docs.claude.com.
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_MAX_TOKENS = 1024;

export interface AnthropicAdapterOptions {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

export class AnthropicAdapter implements ModelAdapter {
  readonly provider = "anthropic";
  readonly model: string;
  private readonly client: Anthropic;
  private readonly maxTokens: number;

  constructor(options: AnthropicAdapterOptions = {}) {
    // Omitting apiKey lets the SDK fall back to ANTHROPIC_API_KEY.
    this.client = new Anthropic(options.apiKey ? { apiKey: options.apiKey } : {});
    this.model = options.model ?? DEFAULT_MODEL;
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: request.maxTokens ?? this.maxTokens,
      temperature: request.temperature,
      system: request.system,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      tools: request.tools.map(toAnthropicTool),
    });

    const toolCalls: ToolCall[] = [];
    let text = "";
    for (const block of response.content) {
      if (block.type === "tool_use") {
        toolCalls.push({
          name: block.name,
          arguments: (block.input ?? {}) as Record<string, unknown>,
        });
      } else if (block.type === "text") {
        text += block.text;
      }
    }

    return { toolCalls, text, stopReason: response.stop_reason ?? "unknown", raw: response };
  }
}

function toAnthropicTool(tool: DiscoveredTool) {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema as { type: "object"; [key: string]: unknown },
  };
}
