import * as fs from "fs";
import * as path from "path";
import { Builder } from "xml2js";
import { xmlFilesFolder } from "../../utils/constants";
import { InvoiceDataType } from "../openAi/invoiceJsonSchema";
import { Dokument, Paczka } from "./types";

export class XmlService {
  public processDataToXml(data: InvoiceDataType[], isVatPayer: boolean): Paczka {
    const firstMonth = data[0]?.documentDate.slice(0, 7) || "unknown";
  
    const paczka: Paczka = {
      $: {
        wersja: "15",
        miesiac: firstMonth,
        KSeF: "prod",
      },
      dokument: data.map((item) => {
        const documentObject: Dokument = {
          data: item.documentDate,
          data_wystawienia: item.documentDate,
          numer: item.invoiceNumber,
          kontrahent: {
            NIP: item.oppositeNip,
          },
          ksieguj: {
            kwota: isVatPayer ? item.invoiceNettoValue.toFixed(2) : item.invoiceBruttoValue.toFixed(2),
          },
          $: {
            dekret: "wydatek",
          },
        };
  
        if (isVatPayer) {
          documentObject.rejVAT = {
            suma: [
              {
                netto: item.invoiceNettoValue,
                VAT: item.vatValue,
                $: {
                  stawka: item.vatRate,
                },
              },
            ],
          };
        }
  
        return documentObject;
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
