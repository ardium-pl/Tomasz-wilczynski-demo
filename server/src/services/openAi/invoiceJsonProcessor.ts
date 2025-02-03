import { zodResponseFormat } from "openai/helpers/zod";
import { client } from "../../utils/constants";
import { DrawingData, InvoiceDataType } from "./invoiceJsonSchema";

export async function parseOcrText(ocrText: string, clientName: string): Promise<InvoiceDataType> { // TODO: CHANGE THE PROMPT TO ENSURE THAT CLIENTNAME AND ISVATPAYER ARE USED IN THE PROMPT
  const completion = await client.beta.chat.completions.parse({
    model: "o3-mini-2025-01-31",
    messages: [
      {
        role: "system",
        content: `
        You are an expert in extracting structured data from technical drawings. 
        Your task is to analyze a given text taken from a technical drawing and extract relevant metadata in a structured format:
        You should follow these rules:
        Extract only metadata – Ignore technical dimensions, tolerances, and geometric details.
        Standardize dates – Convert dates to the "YYYY-MM-DD" format.
        Handle missing data – If a field is missing, return an empty string ("") or an empty array ([]) where applicable.
        Normalize units – Convert weight to kilograms (kg).
        Extract the drawing name correctly – The "partName" field should contain the title or name of the drawing.
        Extract the scale correctly – The "scale" field should contain the scale of the drawing, such as "1:1", "1:2", etc.
        Extract sheet information correctly – The "sheets" field should contain the sheet number in the format "n/m", e.g., "1/2".
        Extract the manufacturer reference correctly – The "manufacturerReference" field should contain the name of the company that owns the drawing.
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
