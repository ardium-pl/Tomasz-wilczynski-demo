import vision from "@google-cloud/vision";
import dotenv from "dotenv";
import fs from "fs-extra";
import path from "path";
import { convertPdfToImages } from "../../src/utils/convertPdfToImage.js";
import { deleteFile } from "../../src/utils/deleteFile.js";
import { logger } from "../../src/utils/logger.js";

dotenv.config();

const VISION_AUTH = {
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: (process.env.GOOGLE_PRIVATE_KEY as string).replace(/\\n/g, "\n"), // Handling the private key newline issue
  },
  fallback: true, // Force use of REST API instead of gRPC
};

export async function pdfOCR(pdfFilePath) {
  const inputPdfFolder = "./input-pdf";
  const imagesFolder = "./images";
  const outputTextFolder = "./output-text";
  const fileNameWithoutExt = path.basename(pdfFilePath, ".pdf");

  await Promise.all(
    [inputPdfFolder, imagesFolder, outputTextFolder].map(fs.ensureDir)
  );

  try {
    const imageFilePaths = await convertPdfToImages(pdfFilePath, imagesFolder);
    deleteFile(pdfFilePath);
    logger.info(`🖼️ Converted PDF to images: ${imageFilePaths.join(", ")}`);

    if (imageFilePaths.length === 0) {
      logger.error("No images were generated from the PDF");
      return [];
    }

    const ocrResults = await Promise.all(
        imageFilePaths.map(async (imageFilePath) => {
          const ocrResult = await fileOcr(imageFilePath);
          if (ocrResult) {
            return ocrResult.googleVisionText;
          } else {
            logger.warn(`No text found in image: ${imageFilePath}`);
            return "";
          }
        })
      );
      
      const concatenatedResults = ocrResults.join("\n");

    await _saveDataToTxt(
      outputTextFolder,
      fileNameWithoutExt,
      concatenatedResults
    );

    logger.info(
      ` 💚 Successfully processed and saved the OCR results for ${pdfFilePath}`
    );

    // Delete the image files after processing
    for (const imageFilePath of imageFilePaths) {
      logger.warn(`Deleting temporary image: ${imageFilePath}`);
      deleteFile(imageFilePath);
    }

    return concatenatedResults;
  } catch (err) {
    logger.error(`Error processing ${pdfFilePath}:`, err);
    return "";
  }
}

async function _saveDataToTxt(folder, fileNameWithoutExt, text) {
  const textPath = path.join(folder, `${fileNameWithoutExt}.txt`);

  try {
    await fs.writeFile(textPath, text, "utf8");
    logger.info(` 💚 Successfully saved the text file at: ${textPath}`);
  } catch (err) {
    logger.error(`Error saving the text file: ${err.message}`);
  }
}

export async function fileOcr(imageFilePath: string) {
  const client = new vision.ImageAnnotatorClient(VISION_AUTH);

  logger.info(` 🕶️ Processing image with Google Vision: ${imageFilePath}`);
  try {
    const [result] = await client.documentTextDetection(imageFilePath);

    if (!result.fullTextAnnotation) {
      return null;
    }

    logger.info(` 💚 Successfully processed image ${imageFilePath}`);
    const googleVisionText = result.fullTextAnnotation.text;
    return { googleVisionText };
  } catch (err) {
    logger.error(`Error during Google Vision OCR processing: ${err.message}`);
    // Instead of throwing an error, we'll just log it and continue
  }

  return null;
}
