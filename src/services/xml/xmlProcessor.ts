import * as fs from "fs";
import * as path from "path";
import { Builder } from "xml2js";
import { xmlFilesFolder } from "../../utils/constants";
import { InvoiceDataType } from "../openAi/invoiceJsonSchema";
import { Paczka } from "./types";
import { getVatPercentage } from "../../utils/xmlProcessor";

export class XmlService {
  public processDataToXml(data: InvoiceDataType[]): Paczka {
    const firstMonth = data[0]?.documentDate.slice(0, 7) || "unknown";

    
    const paczka: Paczka = {
      $: {
        wersja: "15",
        miesiac: firstMonth,
        KSeF: "prod",
      },
      dokument: data.map((item) => {
        const vatPercentage = getVatPercentage(item.vatRate); 
        const vatValue = +(item.invoiceNettoValue * vatPercentage).toFixed(2);
  
        return {
          data: item.documentDate,
          data_wystawienia: item.documentDate,
          numer: item.invoiceNumber,
          kontrahent: {
            NIP: item.sellerNip,
            nazwa: item.sellerName,
            adres: item.address,
          },
          ksieguj: {
            kwota: item.invoiceNettoValue.toFixed(2),
          },
          konto: item.bankAccount.replace(/\s+/g, ""),
          $: {
            dekret: item.decret,
          },
          rejVAT: {
            suma: [
              {
                netto: item.invoiceNettoValue,
                VAT: vatValue,
                $: {
                  stawka: item.vatRate,
                },
              },
            ],
          },
        };
      }),
    };
  
    return paczka;
  }

  public convertPaczkaToXml(processedXmlData: Paczka): string {
    const builder = new Builder({
      xmldec: { version: "1.0", encoding: "UTF-8" },
      rootName: "paczka",
      renderOpts: { pretty: true },
    });
    const xml = builder.buildObject(processedXmlData);
    return xml;
  }

  public saveXmlToFile(xml: string, fileName: string): string {
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);

    const finalFileName = `${baseName}.xml`;
    const filePath = path.join(xmlFilesFolder, finalFileName);

    if (!fs.existsSync(xmlFilesFolder)) {
      fs.mkdirSync(xmlFilesFolder, { recursive: true });
    }

    fs.writeFileSync(filePath, xml, "utf8");

    return filePath;
  }
}
