import { listAllFiles } from "./drive/google-api.js";
import { pdfOCR } from "./services/ocr/ocr.js";
import { downloadFile } from "./utils/downloadFile.js";
import { logger } from "./utils/logger.js";

const FOLDER_ID = process.env.FOLDER_ID;

async function main() {
  const inputPdfFolder = "./input-pdf";
  const imagesFolder = "./images";
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
      const ocrData = await pdfOCR(pdfFilePath);
      logger.info(ocrData);


    } catch (err) {
      logger.error(`Error processing:${file.name} ${err}`);
    }
  }
}

main();
