import { z } from "zod";

export const CmrData = z.object({
    sender: z.string(),
    reciever: z.string(),
    carRegistrationNumber: z.string(),
    destination: z.string(),
    loadingPlace: z.string(),
    weight: z.number(),
    issueDate: z.string(),
    recievedDate: z.string()
})


export type CmrDataType = z.infer<typeof CmrData>;
