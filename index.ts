import express from "express";
import cron from "node-cron";
import { listAllFiles } from "./drive/google-api.ts";
import { pdfOCR } from "./services/ocr/ocr.js";
import { downloadFile } from "./src/utils/downloadFile.ts";
import { logger } from "./src/utils/logger.ts";
import { parseOcrText } from "./src/zod-json/invoiceJsonProcessor.ts";

const FOLDER_ID = process.env.FOLDER_ID as string
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '*/1 * * * *'; 
const PORT = process.env.PORT || 3000;
const app = express();

// Start the server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
// Main processing function
async function processFile(file) {
  const inputPdfFolder = "./input-pdf";
  try {
    logger.info(` 🧾 Downloading PDF: ${file.name}`);
    const pdfFilePath = await downloadFile(file.id, inputPdfFolder, file.name);
    logger.info(`🧾 PDF downloaded to: ${pdfFilePath}`);
    
    // Run OCR and get text
    const ocrDataText = await pdfOCR(pdfFilePath);
    logger.info(`📄 OCR Data Text: ${ocrDataText}`);

    // Parse the OCR text
    const parsedData = await parseOcrText(ocrDataText as string);
    logger.info("JSON Schema: ", parsedData);

  } catch (err) {
    logger.error(`Error processing file ${file.name}: ${err.message}`);
  }
}

async function main() {
  const files = await listAllFiles(FOLDER_ID);
  
  if (files.length === 0) {
    logger.info('No files found to process.');
    return;
  }

  try {
    await Promise.all(files.map(file => processFile(file)));
    logger.info('All files processed successfully.');
  } catch (err) {
    logger.error(`An error occurred during file processing: ${err.message}`);
  }
}

// Schedule the script to run based on CRON_SCHEDULE environment variable
cron.schedule(CRON_SCHEDULE, async () => {
  logger.info(`⏰ Running the script based on schedule: ${CRON_SCHEDULE}`);
  await main();
});
