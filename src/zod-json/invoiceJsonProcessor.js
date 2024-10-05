import dotenv from "dotenv";
import OpenAI from "openai";
import { InvoiceData } from "./invoiceJsonSchema.js";
import { zodToJsonSchema } from "zod-to-json-schema";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function parseOcrText(ocrText) {
  // Convert Zod schema to JSON Schema
  const jsonSchema = zodToJsonSchema(InvoiceData, {
    topRef: false, // Prevent top-level $ref
    definitions: false, // Do not include definitions
  });


  // Manually construct response_format
  const responseFormat = {
    type: "json_schema",
    json_schema: {
      name: "offerSummary", // Required by OpenAI
      schema: jsonSchema, // The fully expanded JSON schema
    },
  };

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
    response_format: responseFormat,
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
