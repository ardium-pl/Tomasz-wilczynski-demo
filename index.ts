import fs from "fs-extra";
import { drive_v3 } from "googleapis";
import path from "path";
import { listAllFiles } from "./drive/google-api.ts";
import { visualizeAssignedBoxesOnImage } from "./services/boxProcessor/boxDrawer.ts";
import { pdfOCR } from "./services/ocr/ocr.js";
import { downloadFile } from "./src/utils/downloadFile.ts";
import { logger } from "./src/utils/logger.ts";
import { OpenAIProcessor } from "./services/zod-json/invoiceJsonProcessor.ts";
import { CmrData } from "./services/zod-json/invoiceJsonSchema.ts";
import {
  compareDataPromptForGptVision,
  extractDataFromBoxText,
  finalComparisonPrompt
} from "./services/zod-json/prompts.ts";
import { authorize } from "./services/emailHandling/auth.ts";
import { startImapListener } from "./services/emailHandling/imapListener.ts";

export const DATA_FOLDER = "./data";

const FOLDER_ID = process.env.FOLDER_ID as string;
const openAIProcessor = new OpenAIProcessor();

async function processFile(file: drive_v3.Schema$File) {
  const inputPdfFolder = path.join(DATA_FOLDER, "./input-pdf");
  const blocksFolder = path.join(DATA_FOLDER, "./blocks-jsons");
  const jsonDataFolder = path.join(DATA_FOLDER, "./final-comparison-json-data");
  const drawedBoxesFolder = path.join(DATA_FOLDER, "./drawed-boxes");
  const fileNameWithoutExt = path.parse(file.name as string).name;
  try {
    logger.info(` 🧾 Downloading PDF: ${file.name}`);
    const pdfFilePath = await downloadFile(
      file.id as string,
      inputPdfFolder,
      file.name as string
    );
    logger.info(`🧾 PDF downloaded to: ${pdfFilePath}`);

    const { text: ocrDataText, imagePaths } = await pdfOCR(pdfFilePath);
    // logger.info(`📄 OCR Data Text: ${ocrDataText}`);

    const parsedData = await openAIProcessor.parseOcrText(
      ocrDataText as string,
      extractDataFromBoxText,
      CmrData
    );
    logger.info("JSON Schema: ", parsedData);

    const comparedDataUsingGptVision = await openAIProcessor.compareDataUsingGptVision(
      imagePaths[0],
      CmrData,
      compareDataPromptForGptVision,
      parsedData
    );


    logger.info(`📄 Compared Data: ${file.name} `, comparedDataUsingGptVision);

    const finalComparison = await openAIProcessor.compareJsonData(
      comparedDataUsingGptVision,
      parsedData,
      finalComparisonPrompt,
      ocrDataText,
      CmrData
    );

    const outputDirs = [
      "json-data",
      "compared-gpt-vision-json-data",
      "compared-google-vision-data",
      "final-comparison-json-data",
      "drawed-boxes"
    ].map((dir) => path.join(DATA_FOLDER, dir));

    await Promise.all(outputDirs.map(fs.ensureDir));
    
    const jsonFilePath = path.join(jsonDataFolder, `final-comparison-${fileNameWithoutExt}.json`);
    const blocksJsonPath = path.join(blocksFolder, `${fileNameWithoutExt}.json`);
    const outputDrawedImagePath = path.join(drawedBoxesFolder, `${fileNameWithoutExt}.png`);

    // Write JSON outputs
    await fs.writeJSON(path.join(outputDirs[0], `${fileNameWithoutExt}.json`), parsedData, { spaces: 2 });
    await fs.writeJSON(path.join(outputDirs[1], `compared-gpt-vision-${fileNameWithoutExt}.json`), comparedDataUsingGptVision, { spaces: 2 });
    await fs.writeJSON(path.join(outputDirs[3], `final-comparison-${fileNameWithoutExt}.json`), finalComparison, { spaces: 2 });
    await visualizeAssignedBoxesOnImage(blocksJsonPath, imagePaths[0], jsonFilePath, outputDrawedImagePath);

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


async function startImap() {
  try {
      // Create necessary data directories
      // await createDataDirectories();

      // Set up OAuth2 credentials
      const CREDENTIALS = {
          client_id: process.env.CLIENT_ID as string,
          client_secret: process.env.CLIENT_SECRET as string,
          redirect_uris: process.env.REDIRECT_URIS as string,
      };
      
      if (!CREDENTIALS.client_id || !CREDENTIALS.client_secret || !CREDENTIALS.redirect_uris) {
        throw new Error(
          "Missing required environment variables. " +
          "Please set CLIENT_ID, CLIENT_SECRET, and REDIRECT_URIS."
        );
      }

      const oAuth2Client = await authorize(CREDENTIALS);

      // Check if the --reset argument is present
      const shouldReset = process.argv.includes("--reset");

      if (shouldReset) {
          logger.info("Resetting emails and removing attachment folders...");
          // await resetEmailsAndAttachments(oAuth2Client);
          logger.info("Reset completed.");
          process.exit(0); // Exit successfully after reset
      } else {
          // Normalny tryb pracy - nasłuchiwanie i przetwarzanie nowych e-maili
          await startImapListener(oAuth2Client);
      }
  } catch (error) {
      logger.error("An error occurred during execution:", error);
      process.exit(1); // Exit with error code
  }
}

// await main()
await startImap();
