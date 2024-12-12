import "dotenv/config";
import { drive_v3 } from "googleapis";
import { GoogleDriveService } from "./src/services/drive/google-api.ts";
import { pdfOCR } from "./src/services/ocr/ocr.ts";
import { parseOcrText } from "./src/services/openAi/invoiceJsonProcessor.ts";
import { XmlService } from "./src/services/xml/xmlProcessor.ts";
import { inputPdfFolder, PDF_FOLDER_ID, XML_FOLDER_ID } from "./src/utils/constants.ts";
import { downloadFile } from "./src/utils/downloadFile.ts";
import { logger } from "./src/utils/logger.ts";
import path from "path";

const googleDrive = new GoogleDriveService();

async function processSingleFile(file: drive_v3.Schema$File): Promise<void> {
  if (!file || !file.name || !file.id) {
    logger.warn(`Skipping file due to missing name or ID: ${JSON.stringify(file)}`);
    return;
  }

  const fileExtension = path.extname(file.name);
  const fileBaseName = path.basename(file.name, fileExtension);
  const xmlService = new XmlService();

  try {
    logger.info(`🧾 Downloading PDF: ${file.name}`);
    const pdfFilePath = await downloadFile(file.id, inputPdfFolder, file.name);
    logger.info(`🧾 PDF downloaded to: ${pdfFilePath}`);

    logger.info(`🔍 Performing OCR on PDF: ${file.name}`);
    const ocrDataText = await pdfOCR(pdfFilePath);
    logger.info(`📄 OCR Extracted Text: ${ocrDataText}`);

    logger.info(`🧩 Parsing OCR text into JSON schema: ${file.name}`);
    const parsedData = await parseOcrText(ocrDataText);
    logger.info("📦 Parsed JSON Schema: ", parsedData);

    logger.info(`🔧 Converting JSON schema to XML: ${file.name}`);
    const processedXmlData = xmlService.processDataToXml(parsedData);
    const xmlString = xmlService.convertPaczkaToXml(processedXmlData);

    logger.info(`💾 Saving XML to file system: ${fileBaseName}.xml`);
    const xmlFilePath = xmlService.saveXmlToFile(xmlString, `${fileBaseName}.xml`);

    logger.info(`☁️ Uploading XML file (${fileBaseName}.xml) to Google Drive`);
    await googleDrive.uploadFile(XML_FOLDER_ID, `${fileBaseName}.xml`, xmlFilePath);
    logger.info(`✅ File ${fileBaseName}.xml uploaded successfully.`);
  } catch (err: any) {
    logger.error(`❌ Error processing file ${file.name}: ${err?.message || err}`);
  }
}

async function main(): Promise<void> {
  logger.info("🚀 Starting file processing...");

  try {
    const files = await googleDrive.listAllFiles(PDF_FOLDER_ID);

    if (files.length === 0) {
      logger.info("No files found to process.");
      return;
    }

    logger.info(`Found ${files.length} file(s) to process.`);
    await Promise.all(files.map((file) => processSingleFile(file)));

    logger.info("🎉 All files processed successfully.");
  } catch (err: any) {
    logger.error(`An error occurred during file processing: ${err?.message || err}`);
  }
}

await main();

