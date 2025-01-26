import { zodResponseFormat } from "openai/helpers/zod";
import { client } from "../../utils/constants";
import { InvoiceData, InvoiceDataType } from "./invoiceJsonSchema";

export async function parseOcrText(ocrText: string, clientName: string): Promise<InvoiceDataType> { // TODO: CHANGE THE PROMPT TO ENSURE THAT CLIENTNAME AND ISVATPAYER ARE USED IN THE PROMPT
  const completion = await client.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content: `You are an expert in parsing technical drawing data from OCR text. Extract the drawing name according to provided schema.`

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
