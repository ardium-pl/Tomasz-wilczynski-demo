import { listAllFiles } from "./drive/google-api.js";
import { pdfOCR } from "./services/ocr/ocr.js";
import { convertPdfToImages } from "./utils/convertPdfToImage.js";
import { downloadFile } from "./utils/downloadFile.js";
import { logger } from "./utils/logger.js";

const FOLDER_ID = process.env.FOLDER_ID;

async function main() {
  const inputPdfFolder = "./input-pdf";
  const imagesFolder = "./images";
  const files = await listAllFiles(FOLDER_ID);
  for (const file of files) {
    try {
      console.log(` 🧾 Downloading PDF: ${file.name}`);
      const pdfFilePath = await downloadFile(
        file.id,
        inputPdfFolder,
        file.name
      );
      console.log(`🧾 PDF downloaded to: ${pdfFilePath}`);
      const ocrData = await pdfOCR(pdfFilePath);
      console.log(ocrData);


    } catch (err) {
      logger.error(`Error processing:${file.name} ${err}`);
    }
  }

  console.log(files);
}

main();
