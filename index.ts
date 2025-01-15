import { drive_v3 } from "googleapis";
import { listAllFiles } from "./drive/google-api.ts";
import { pdfOCR } from "./services/ocr/ocr.js";
import { downloadFile } from "./src/utils/downloadFile.ts";
import { logger } from "./src/utils/logger.ts";
import { parseOcrText } from "./src/zod-json/invoiceJsonProcessor.ts";
import path from "path";
import fs from "fs-extra";
import { extractDataFromBoxText } from "./src/zod-json/prompts.ts";

export const DATA_FOLDER = "./data";
const FOLDER_ID = process.env.FOLDER_ID as string;

async function processFile(file: drive_v3.Schema$File) {
  const inputPdfFolder = path.join(DATA_FOLDER, "./input-pdf");
  try {
    logger.info(` 🧾 Downloading PDF: ${file.name}`);
    const pdfFilePath = await downloadFile(
      file.id as string,
      inputPdfFolder,
      file.name as string
    );
    logger.info(`🧾 PDF downloaded to: ${pdfFilePath}`);

    const ocrDataText = await pdfOCR(pdfFilePath);
    logger.info(`📄 OCR Data Text: ${ocrDataText}`);

    const parsedData = await parseOcrText(ocrDataText as string, extractDataFromBoxText);
    logger.info("JSON Schema: ", parsedData);

    const outputDir = path.join(DATA_FOLDER, "json-data");
    fs.ensureDirSync(outputDir);
    const outputFilePath = path.join(outputDir, `${file.name}.json`);
    await fs.writeJSON(outputFilePath, parsedData, { spaces: 2 });
  } catch (err) {
    logger.error(`Error processing file ${file.name}: ${err.message}`);
  }
}

async function main() {
  const files = await listAllFiles(FOLDER_ID);

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
