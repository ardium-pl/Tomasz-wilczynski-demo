import { InvoiceDataType } from "../openAi/invoiceJsonSchema";
import { Paczka } from "./types";
import { Builder } from 'xml2js';
import * as fs from 'fs';
import * as path from 'path';
import { xmlFilesFolder } from "../../utils/constants";

export class XmlService {
  public processDataToXml(data: InvoiceDataType): Paczka {
    const month = data.documentDate.slice(0, 7);

    const paczka: Paczka = {
      $: {
        wersja: '15',
        ksiega: 'nie', // assuming PKPiR is used
        VAT: 'tak',    // assuming the company is VAT taxpayer
        miesiac: month,
        KSeF: 'prod'   // default environment
      },
      dokument: [
        {
          data: data.documentDate,      // data zdarzenia
          numer: data.invoiceNumber,     // numer dowodu księgowego
          kontrahent: {
            NIP: data.sellerNip,
            nazwa: data.sellerName,
            adres: data.address,
            $: {
              VAT: 'tak' // Assuming the seller is a VAT taxpayer. Adjust if needed.
            }
          },
          // We can add ksieguj to register the transaction in the ledger.
          // Since we are not using rejVAT, we can use kwota directly.
          ksieguj: {
            kwota: data.invoiceNettoValue.toFixed(2) // formatting to two decimals
          },
          $: {
            dekret: 'sprz'
          }
        }
      ]
    };

    return paczka;
  }

  public convertPaczkaToXml(processedXmlData: Paczka): string {
    const builder = new Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      rootName: 'paczka',
      renderOpts: { pretty: true }
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
