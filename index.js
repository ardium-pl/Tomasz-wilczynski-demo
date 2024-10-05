import express from "express";
import cron from "node-cron";
import fs from "fs-extra";
import { listAllFiles } from "./drive/google-api.js";
import { pdfOCR } from "./services/ocr/ocr.js";
import { downloadFile } from "./src/utils/downloadFile.js";
import { logger } from "./src/utils/logger.js";
import { parseOcrText } from "./src/zod-json/invoiceJsonProcessor.js";

const FOLDER_ID = process.env.FOLDER_ID;

const app = express();

// Function to run your main script
async function main() {
  const inputPdfFolder = "./input-pdf";
  const files = await listAllFiles(FOLDER_ID);
  for (const file of files) {
    try {
      logger.info(` 🧾 Downloading PDF: ${file.name}`);
      const pdfFilePath = await downloadFile(
        file.id,
        inputPdfFolder,
        file.name
      );
      logger.info(`🧾 PDF downloaded to: ${pdfFilePath}`);
      const ocrDataText = await pdfOCR(pdfFilePath);
      logger.info(`📄 OCR Data Text\n${ocrDataText}`);
      const parsedData = await parseOcrText(ocrDataText);
      logger.info("JSON Schema: ", parsedData);
    } catch (err) {
      logger.error(`Error processing: ${file.name} ${err}`);
    }
  }
}

// Schedule the script to run every day at 5 AM
cron.schedule("*/1 * * * *", async () => {
  logger.info("⏰ Running the script at 5 AM");
  await main();
});

// Express server
app.get("/", (req, res) => {
  res.send("Server is running and scheduled task is active.");
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
