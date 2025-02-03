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


export const DrawingData = z.object({
  name: z.string(),
  dateCreated: z.string(),
  lastModified: z.string(),
  scale: z.string(),
  sheets: z.string(),
  weight: z.string(),
  material: z.string(),
  surfaceTreatment: z.string(),
  manufacturerReference: z.string(),
});

// Infer the types
export type InvoiceDataType = z.infer<typeof DrawingData>;
export type DekretType = z.infer<typeof Dekret>;
export type StawkaType = z.infer<typeof Stawka>;
