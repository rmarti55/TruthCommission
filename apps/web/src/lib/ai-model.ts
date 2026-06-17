import { createOpenAI } from "@ai-sdk/openai";

export function getSummaryModel() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    const openrouter = createOpenAI({
      apiKey: openRouterKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
    return openrouter(process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash-lite");
  }

  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  if (gatewayKey) {
    const gateway = createOpenAI({
      apiKey: gatewayKey,
      baseURL: "https://ai-gateway.vercel.sh/v1",
    });
    return gateway("gpt-4o-mini");
  }

  return null;
}
