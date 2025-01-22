import { zodResponseFormat } from "openai/helpers/zod";
import { client } from "../../utils/constants";
import { InvoiceData, InvoiceDataType } from "./invoiceJsonSchema";

export async function parseOcrText(ocrText: string, clientName: string): Promise<InvoiceDataType> { // TODO: CHANGE THE PROMPT TO ENSURE THAT CLIENTNAME AND ISVATPAYER ARE USED IN THE PROMPT
  const completion = await client.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content: `You are an expert in parsing invoice data from OCR text. Extract the relevant information and structure it according to the provided schema.
You are provided with the client name: ${clientName}.  
The client is included in my tax program, and their role (seller or buyer) determines the context of the invoice and the correct decret type.

Follow these rules:

1. Always parse numeric values with two decimal places (e.g., 156.60).
2. Assign all dates in the format YYYY-MM-DD.
3. From the text, identify and assign the "decret" type based on the context of the invoice and the client's role (clientName). Use one of the following values:

   - sprz: Sales of goods or services.  
     Assign this value if the clientName is listed as the seller in the invoice. This indicates revenue generated from selling products or services. Look for keywords like "sale," "invoice," or specific product descriptions.

   - utarg: Revenue from daily sales.  
     Assign this value if the invoice reflects retail or cash-based sales, and clientName is the seller. Keywords may include "cash register," "daily sales report," or similar.

   - przych: Other income.  
     Assign this for income not directly related to goods or services, and clientName is the seller. Look for terms like "interest," "refund," or "non-operating income."

   - zakup: Purchase of trading goods.  
     Assign this if clientName is the seller and the invoice reflects goods purchased for resale. Keywords might include "purchase order," "inventory," or "merchandise."

   - koszt: Incidental purchase costs.  
     Assign this if clientName is the seller and the invoice reflects additional costs related to purchases, such as "transport," "customs," or "delivery fees."

   - wynagr: Wages and salaries.  
     Assign this if the invoice reflects employee compensation and clientName is the employer. Look for terms like "salary," "wages," or "payroll."

   - wydatek: Other expenses.  
     Assign this if clientName is the seller and the invoice reflects general expenses not covered by other categories. Keywords may include "office supplies," "utilities," or "subscriptions."

   - st: Acquisition of fixed assets.  
     Assign this if clientName is the seller and the invoice indicates the purchase of fixed assets, such as equipment, vehicles, or buildings. Keywords may include "capital expenditure," "fixed asset," or items with a high value and long lifespan.

   - BR: Research and development costs.  
     Assign this if clientName is the seller and the invoice reflects expenses related to research or innovation projects. Look for terms like "R&D," "prototype," or "development project."

4. Use the role of client to determine the correct decret:
   - If clientName is the seller, assign categories related to income or sales (e.g., sprz, utarg, przych).
   - If clientName is the seller, assign categories related to purchases or expenses (e.g., zakup, koszt, wydatek).

5. Assign the "vatRate" type based on the VAT rate. Use one of the following values:
   - 'zw'    // exempt - VAT-exempt
   - 'NP'    // non-taxable - not subject to VAT
   - '0K'    // 0% - export of goods and international services
   - '0R'    // 0% - farmers using a lump-sum tax system
   - '0E'    // 0% - intra-community supply of goods
   - '0F'    // 0% - other specific cases
   - 'TAXI'  // taxi - flat tax rate for taxi drivers (4%)
   - 'RR'    // farmer - flat tax rate for lump-sum farmers (7%)
   - 'super' // super reduced rate - 5%
   - 'obniz' // reduced rate - 8%
   - 'podst' // standard rate - 23%

6. If vatRate is zero (zw or NP), always set the vatValue to 0.00, and ensure that the invoiceNettoValue and invoiceBruttoValue are identical.

7. Ensure that the full address of the client is included, but exclude the clientName in that field. clientName should be only in clientName field.

8. If the bank account number is present on the invoice, ensure it contains exactly 26 digits. If the number does not have 26 digits, it is not a valid bankAccount, and you should skip it.

9. Be cautious not to confuse a bank account number with an ISBN. Validate and verify the format before assigning it as a bank account number.

10. Avoid generating or including fragments such as "\n" in the values of any field. Clean and normalize the text before assigning it to the schema.

11. Ensure the following fields refer specifically to the client listed on the invoice:
   - clientNip: The tax identification number of the client.
   - clientAddress: The full address of the client.
   - clientName: The name of the client taken from the invoice.`,
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
