import { drive_v3 } from "googleapis";
import { listAllFiles } from "./drive/google-api.ts";
import { pdfOCR } from "./services/ocr/ocr.js";
import { downloadFile } from "./src/utils/downloadFile.ts";
import { logger } from "./src/utils/logger.ts";
import { OpenAIProcessor } from "./src/zod-json/invoiceJsonProcessor.ts";
import { CmrData } from "./src/zod-json/invoiceJsonSchema.ts";
import path from "path";
import fs from "fs-extra";
import {
  extractDataFromBoxText,
  compareDataPromptForGoogleVision,
  compareDataPromptForGptVision,
  finalComparisonPrompt,
} from "./src/zod-json/prompts.ts";
import { visualizeAssignedBoxesOnImage } from "./services/boxProcessor/boxDrawer.ts";

export const DATA_FOLDER = "./data";

const FOLDER_ID = process.env.FOLDER_ID as string;
const openAIProcessor = new OpenAIProcessor();

async function processFile(file: drive_v3.Schema$File) {
  const inputPdfFolder = path.join(DATA_FOLDER, "./input-pdf");
  const blocksFolder = path.join(DATA_FOLDER, "./blocks-jsons");
  const jsonDataFolder = path.join(DATA_FOLDER, "./json-data");
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


    const comparedDataUsingGoogleVision = await openAIProcessor.compareDataUsingGoogleVision(
      ocrDataText as string,
      CmrData,
      compareDataPromptForGoogleVision,
      parsedData
    );

    logger.info(`📄 Compared Data: ${file.name} `, comparedDataUsingGptVision);

    const finalComparison = await openAIProcessor.compareJsonData(
      comparedDataUsingGptVision,
      comparedDataUsingGoogleVision,
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
    
    const jsonFilePath = path.join(jsonDataFolder, `${fileNameWithoutExt}.json`);
    const blocksJsonPath = path.join(blocksFolder, `${fileNameWithoutExt}.json`);
    const outputDrawedImagePath = path.join(drawedBoxesFolder, `${fileNameWithoutExt}.png`);

    // Write JSON outputs
    await fs.writeJSON(path.join(outputDirs[0], `${fileNameWithoutExt}.json`), parsedData, { spaces: 2 });
    // await fs.writeJSON(path.join(outputDirs[1], `compared-gpt-vision-${file.name}.json`), comparedDataUsingGptVision, { spaces: 2 });
    // await fs.writeJSON(path.join(outputDirs[2], `compared-google-vision-${file.name}.json`), comparedDataUsingGoogleVision, { spaces: 2 });
    // await fs.writeJSON(path.join(outputDirs[3], `final-comparison-${file.name}.json`), finalComparison, { spaces: 2 });
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

await main();
