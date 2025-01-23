import { z } from "zod";

// Define the Dekret type as an enum
const Dekret = z.enum([
  "sprz", // sprzedaż towarów lub usług
  "utarg", // utarg
  "przych", // pozostałe przychody
  "zakup", // zakup towarów handlowych
  "koszt", // koszty uboczne zakupu
  "wynagr", // wynagrodzenia
  "wydatek", // pozostałe wydatki
  "st", // nabycie środka trwałego
  "BR", // koszt działalności badawczo-rozwojowej
]);

const Stawka = z.enum([
  "zw",    // zwolniona - zwolniona z VAT
  "NP",    // nie podlega - nie podlega opodatkowaniu VAT
  "0K",    // 0% - eksport towarów i usługi międzynarodowe
  "0R",    // 0% - rolnicy ryczałtowi
  "0E",    // 0% - WDT (wewnątrzwspólnotowa dostawa towarów)
  "0F",    // 0% - inne szczególne przypadki
  "TAXI",  // taksówka - stawka ryczałtowa dla taksówkarzy (4%)
  "RR",    // rolnik ryczałtowy - stawka ryczałtowa dla rolników ryczałtowych (7%)
  "super", // stawka super obniżona - stawka 5%
  "obniz", // stawka obniżona - stawka 8%
  "podst", // stawka podstawowa - stawka 23%
]);


export const InvoiceData = z.object({
  invoiceNumber: z.string(),
  oppositeNip: z.string(),
  shipDate: z.string(),
  documentDate: z.string(),
  oppositeAddress: z.string(),
  oppositeName: z.string(),
  invoiceNettoValue: z.number(),
  invoiceBruttoValue: z.number(),
  bankAccount: z.string(),
  vatRate: Stawka,
  decret: Dekret,
  vatValue: z.number().optional(),
});

// Infer the types
export type InvoiceDataType = z.infer<typeof InvoiceData>;
export type DekretType = z.infer<typeof Dekret>;
export type StawkaType = z.infer<typeof Stawka>;
