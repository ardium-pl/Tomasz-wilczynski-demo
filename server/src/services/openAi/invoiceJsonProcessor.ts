import { zodResponseFormat } from "openai/helpers/zod";
import { client } from "../../utils/constants";
import { DrawingData, InvoiceDataType } from "./invoiceJsonSchema";

export async function parseOcrText(ocrText: string, clientName: string): Promise<InvoiceDataType> { // TODO: CHANGE THE PROMPT TO ENSURE THAT CLIENTNAME AND ISVATPAYER ARE USED IN THE PROMPT
  const completion = await client.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content: `You are an expert in extracting structured data from technical drawings. Your task is to analyze a given technical drawing and extract relevant metadata in a structured format. The output should be formatted according to the following TypeScript interface:
        **Instructions:**
1. **Extract only metadata** – Ignore technical dimensions, tolerances, and geometric details.
2. **Follow the interface strictly** – Ensure each extracted value matches the expected data type.
3. **Standardize dates** – Convert dates to "YYYY-MM-DD" format.
4. **Handle missing data** – If a field is missing, return an empty string ("") or an empty array ([]) where applicable.
5. **Normalize units** – Convert weight to kilograms (kg).
6. **Extract standards correctly** – Identify industry standards (e.g., ISO, DIN, ANSI) and list them in standards.
7. **Keep text clean** – Remove unnecessary symbols, extra spaces, and non-relevant information.

`

      },
      { role: "user", content: ocrText },
    ],
    response_format: zodResponseFormat(DrawingData, "invoiceData"),
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
