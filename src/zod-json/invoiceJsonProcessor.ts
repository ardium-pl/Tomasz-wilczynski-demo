import dotenv from "dotenv";
import OpenAI from "openai";
// import { InvoiceData } from "./invoiceJsonSchema.ts";
import { CmrData, CmrDataType } from "./invoiceJsonSchema.ts";
import { zodResponseFormat } from "openai/helpers/zod";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function parseOcrText(ocrText: string, prompt: string): Promise<CmrDataType> {
  const completion = await client.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content: prompt,
      },
      { role: "user", content: ocrText },
    ],
    response_format: zodResponseFormat(CmrData, "CmrData"),
  });

  const message = completion.choices[0]?.message;
  if (message?.parsed) {
    return message.parsed;
  } else if (message?.refusal) {
    throw new Error(` 🤖 AI refused to process the text: ${message.refusal}`);
  } else {
    throw new Error("Failed to parse OCR text");
  }
}

