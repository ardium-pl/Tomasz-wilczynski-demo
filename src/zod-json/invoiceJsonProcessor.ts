import dotenv from "dotenv";
import OpenAI from "openai";
import { InvoiceData } from "./invoiceJsonSchema.ts";
import { zodResponseFormat } from "openai/helpers/zod";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function parseOcrText(ocrText: string): Promise<InvoiceData> {
  const completion = await client.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content:
          "You are an expert in parsing invoice data from OCR text. Extract the relevant information and " +
          "structure it according to the provided schema. Remember to parse values with 2 places after decimal, so e.g. 156.60 etc.",
      },
      { role: "user", content: ocrText },
    ],
    response_format: zodResponseFormat(InvoiceData, "invoiceData"),
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
