import * as fs from "fs";
import * as path from "path";
import { Builder } from "xml2js";
import { xmlFilesFolder } from "../../utils/constants";
import { InvoiceDataType } from "../openAi/invoiceJsonSchema";
import { Paczka } from "./types";

export class XmlService {
  public processDataToXml(data: InvoiceDataType[]): Paczka {
    const firstMonth = data[0]?.documentDate.slice(0, 7) || "unknown";

    const paczka: Paczka = {
      $: {
        wersja: "15",
        miesiac: firstMonth,
        KSeF: "prod", // default environment
      },
      dokument: data.map((item) => ({
        data: item.documentDate,
        data_wystawienia: item.documentDate,
        numer: item.invoiceNumber,
        kontrahent: {
          NIP: item.sellerNip,
          nazwa: item.sellerName,
          adres: item.address,
          $: {
            VAT: "tak",
          },
        },
        ksieguj: {
          kwota: item.invoiceNettoValue.toFixed(2),
        },
        konto: item.bankAccount.replace(/\s+/g, ""),
        $: {
          dekret: "sprz",
        },
      })),
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

    // Always save with .xml extension
    const finalFileName = `${baseName}.xml`;
    const filePath = path.join(xmlFilesFolder, finalFileName);

    // Ensure the directory exists
    if (!fs.existsSync(xmlFilesFolder)) {
      fs.mkdirSync(xmlFilesFolder, { recursive: true });
    }

    fs.writeFileSync(filePath, xml, "utf8");

    // Return the file path so it can be used elsewhere
    return filePath;
  }
}
