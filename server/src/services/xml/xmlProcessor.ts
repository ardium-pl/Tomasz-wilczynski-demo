import * as fs from "fs";
import * as path from "path";
import { Builder } from "xml2js";
import { xmlFilesFolder } from "../../utils/constants";
import { InvoiceDataType } from "../openAi/invoiceJsonSchema";
import { Dokument, Paczka } from "./types";
import { getVatPercentage } from "../../utils/xmlProcessor";

export class XmlService {
  public processDataToXml(data: InvoiceDataType[], isVatPayer: boolean): Paczka {
    const firstMonth = "unknown";
  
    const paczka: Paczka = {
      $: {
        wersja: "15",
        miesiac: firstMonth,
        KSeF: "prod",
      },
      dokument: data.map((item) => {
        const documentObject: Dokument = {
          drawingNumber: item.drawingName,
          partName: item.partName,
          version: item.version,
          dateCreated: item.dateCreated,
          lastModified: item.lastModified,
          author: item.author,
          scale: item.scale,
          sheets: item.sheets,
          weightKg: item.weightKg,
          similarParts: item.similarParts,
          materialClass: item.materialClass,
          surfaceTreatment: item.surfaceTreatment,
          standards: item.standards,
          catalogNumber: item.catalogNumber,
          serialNumber: item.serialNumber,
          manufacturerReference: item.manufacturerReference,
        };
  
        // if (isVatPayer) {
        //   documentObject.rejVAT = {
        //     suma: [
        //       {
        //         netto: item.invoiceNettoValue,
        //         VAT: item.vatValue,
        //         $: {
        //           stawka: item.vatRate,
        //         },
        //       },
        //     ],
        //   };
        // }
  
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
