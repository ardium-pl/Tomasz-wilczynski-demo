import { zodResponseFormat } from "openai/helpers/zod";
import { client } from "../../utils/constants.ts";
import { InvoiceData, InvoiceDataType } from "./invoiceJsonSchema.ts";

export async function parseOcrText(ocrText: string): Promise<InvoiceDataType> {
  const completion = await client.beta.chat.completions.parse({
    model: 'gpt-4o-2024-11-20',
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
