import "server-only"

export type JsonSchema = Record<string, unknown>

export type ToolContext = {
  organizationId: string
}

export type ToolHandlerInput = Record<string, unknown>

export type ToolDefinition = {
  /** Stable tool name exposed to the model. Snake-cased, provider-prefixed. */
  name: string
  /** Plain-English description Claude reads to decide when to call this tool. */
  description: string
  /** JSON Schema describing the expected input. */
  inputSchema: JsonSchema
  /** Server-side handler. Receives validated input + connection context. */
  handler: (input: ToolHandlerInput, ctx: ToolContext) => Promise<unknown>
}

/** Provider-scoped tool factory. Returned tools are already bound to the org context. */
export type ProviderToolModule = {
  providerId: string
  buildTools: () => ToolDefinition[]
}
