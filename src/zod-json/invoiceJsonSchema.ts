import { z } from "zod";

// Define a reusable schema for extracted data with box number
const ExtractedField = z.object({
    box: z.number(),
    value: z.string(),
    confidence: z.number(), 
  });
  
  export const CmrData = z.object({
    sender: ExtractedField,
    receiver: ExtractedField,
    carRegistrationNumber: ExtractedField,
    destination: ExtractedField,
    loadingPlace: ExtractedField,
    weight: z.object({
      box: z.number(),
      value: z.number(), // Keeping weight as a number
      confidence: z.number(), 
    }),
    issueDate: ExtractedField,
    receivedDate: ExtractedField,
  });


export type CmrDataType = z.infer<typeof CmrData>;
