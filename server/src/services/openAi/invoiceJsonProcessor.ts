import { zodResponseFormat } from "openai/helpers/zod";
import { client } from "../../utils/constants.ts";
import { InvoiceData, InvoiceDataType } from "./invoiceJsonSchema.ts";

export async function parseOcrText(ocrText: string, clientName: string, isVatPayer: boolean): Promise<InvoiceDataType> { // TODO: CHANGE THE PROMPT TO ENSURE THAT CLIENTNAME AND ISVATPAYER ARE USED IN THE PROMPT
  const completion = await client.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content: `You are an expert in parsing invoice data from OCR text. Extract the relevant information and structure it according to the provided schema. Please obey these rules:

1. Parse numeric values with two decimal places (e.g., 156.60).
2. Assign all dates in the format YYYY-MM-DD.
3. From the text, identify and assign the "Dekret" type. Use one of the following values:
   - 'sprz'   // sprzedaż towarów lub usług
   - 'utarg'  // utarg
   - 'przych' // pozostałe przychody
   - 'zakup'  // zakup towarów handlowych
   - 'koszt'  // koszty uboczne zakupu
   - 'wynagr' // wynagrodzenia
   - 'wydatek'// pozostałe wydatki
   - 'st'     // nabycie środka trwałego
   - 'BR'     // koszt działalności badawczo-rozwojowej

Make sure to select the most appropriate "Dekret" type based on the provided OCR text.


4. Assign the "Stawka" type based on the VAT rate. Use one of the following values:
   - 'zw'    // zwolniona - zwolniona z VAT
   - 'NP'    // nie podlega - nie podlega opodatkowaniu VAT
   - '0K'    // 0% - eksport towarów i usługi międzynarodowe
   - '0R'    // 0% - rolnicy ryczałtowi
   - '0E'    // 0% - WDT (wewnątrzwspólnotowa dostawa towarów)
   - '0F'    // 0% - inne szczególne przypadki
   - 'TAXI'  // taksówka - stawka ryczałtowa dla taksówkarzy (4%)
   - 'RR'    // rolnik ryczałtowy - stawka ryczałtowa dla rolników ryczałtowych (7%)
   - 'super' // stawka super obniżona - stawka 5%
   - 'obniz' // stawka obniżona - stawka 8%
   - 'podst' // stawka podstawowa - stawka 23%

Make sure to select the most appropriate "Stawka" type based on the provided OCR text.


`,
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
