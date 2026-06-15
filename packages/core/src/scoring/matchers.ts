export interface ExpectTool {
  kind: "tool";
  tool: string;
}

// The assertion union grows in Phase 2 (oneOf, noTool, args subset). A discriminated
// union means new kinds get *added*, not retrofitted into a different shape.
export type Assertion = ExpectTool;

export function expectTool(tool: string): ExpectTool {
  return { kind: "tool", tool };
}