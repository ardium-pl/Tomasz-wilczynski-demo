import dotenv from "dotenv";
import OpenAI from "openai";
// import { InvoiceData } from "./invoiceJsonSchema.ts";
import { CmrData } from "./invoiceJsonSchema.ts";
import { zodResponseFormat } from "openai/helpers/zod";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function parseOcrText(ocrText: string): Promise<CmrData> {
  const completion = await client.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content:
          "You are an expert in parsing logistics data from a CMR document's (Convention on the Contract for the International Carriage of Goods by Road) text. Extract the relevant information and " +
          "structure it according to the provided schema",
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
