import { z } from "zod";

const Product = z.object({
    index: z.string(),
    name: z.string(),
    quantity: z.number(),
    net_price: z.number(),
    vat_rate: z.number(),
    vat_value: z.number(),
    gross_price: z.number()
});

export const InvoiceData = z.object({
    invoiceNumber: z.string(),
    sellerNip: z.string(),
    shipDate: z.string(),
    documentDate: z.string(),
    address: z.string(),
    sellerName: z.string(),
    invoiceNettoValue: z.number(),
    invoiceBruttoValue: z.number(),
    bankAccount: z.string(),
    products: z.array(Product)
});

export type InvoiceData = z.infer<typeof InvoiceData>;
type Product = z.infer<typeof Product>;

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


export type CmrData = z.infer<typeof CmrData>;
