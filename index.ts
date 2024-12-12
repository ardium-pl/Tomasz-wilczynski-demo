import "dotenv/config";
import { drive_v3 } from "googleapis";
import { listAllFiles } from "./src/services/drive/google-api.ts";
import { pdfOCR } from "./src/services/ocr/ocr.ts";
import { downloadFile } from "./src/utils/downloadFile.ts";
import { logger } from "./src/utils/logger.ts";
import { parseOcrText } from "./src/services/openAi/invoiceJsonProcessor.ts";
import { XmlWrapper } from "./src/services/xml/xmlProcessor.ts"
import { inputPdfFolder } from "./src/utils/constants.ts";

const PDF_FOLDER_ID = process.env.PDF_FOLDER_ID as string;

async function processFile(file: drive_v3.Schema$File) {
  const xml = new XmlWrapper();
  try {
    logger.info(` 🧾 Downloading PDF: ${file.name}`);
    const pdfFilePath = await downloadFile(file.id as string, inputPdfFolder, file.name as string);
    logger.info(`🧾 PDF downloaded to: ${pdfFilePath}`);

    const ocrDataText = await pdfOCR(pdfFilePath);
    logger.info(`📄 OCR Data Text: ${ocrDataText}`);

    const parsedData = await parseOcrText(ocrDataText);
    logger.info("JSON Schema: ", parsedData);

    const processedXmlData = xml.processDataToXml(parsedData);
    logger.info(`XML object ${JSON.stringify(processedXmlData, null, 2)}`);
    const xmlString = xml.convertPaczkaToXml(processedXmlData);
    logger.info(`XML string ${xmlString}`);
    xml.saveXmlToFile(xmlString, file.name as string );

  } catch (err) {
    logger.error(`Error processing file ${file.name}: ${err.message}`);
  }
}

async function main() {
  const files = await listAllFiles(PDF_FOLDER_ID);

  if (files.length === 0) {
    logger.info("No files found to process.");
    return;
  }

  try {
    await Promise.all(files.map((file) => processFile(file)));
    logger.info("All files processed successfully.");
  } catch (err) {
    logger.error(`An error occurred during file processing: ${err.message}`);
  }
}

await main();

