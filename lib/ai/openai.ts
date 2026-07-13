import "server-only"

import { createOpenAI } from "@ai-sdk/openai"

const openaiApiKey = process.env.OPENAI_API_KEY

if (!openaiApiKey) {
  throw new Error("OpenAI API key is not configured. Set OPENAI_API_KEY to use ChatGPT API credits.")
}

export const openai = createOpenAI({
  apiKey: openaiApiKey,
})

export const defaultOpenAIModel = openai("gpt-5.5")
