import { StawkaType } from "../services/openAi/invoiceJsonSchema";

export function getVatPercentage(vatRate: StawkaType): number {
  const vatMapping: Record<StawkaType, number> = {
    zw: 0, // zwolniona
    NP: 0, // nie podlega
    "0K": 0,
    "0R": 0,
    "0E": 0,
    "0F": 0,
    TAXI: 0.04, // 4%
    RR: 0.07, // 7%
    super: 0.05, // 5%
    obniz: 0.08, // 8%
    podst: 0.23, // 23%
  };

  return vatMapping[vatRate] || 0;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

