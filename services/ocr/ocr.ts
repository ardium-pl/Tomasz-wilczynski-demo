import vision from "@google-cloud/vision";
import dotenv from "dotenv";
import fs from "fs-extra";
import path from "path";
import { convertPdfToImages } from "../../src/utils/convertPdfToImage";
import { deleteFile } from "../../src/utils/deleteFile";
import { logger } from "../../src/utils/logger";
import { error } from "winston";
import { blockchainnodeengine_v1 } from "googleapis";
import { google } from '@google-cloud/vision/build/protos/protos';


dotenv.config();

type OcrResult = {
  googleVisionText: string;
};

const VISION_AUTH = {
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL as string,
    private_key: (process.env.GOOGLE_PRIVATE_KEY as string).replace(
      /\\n/g,
      "\n"
    ), // Handling the private key newline issue
  },
  fallback: true, // Force use of REST API instead of gRPC
};

export async function pdfOCR(pdfFilePath: string): Promise<string> {
  const inputPdfFolder = "./input-pdf";
  const imagesFolder = "./images";
  const outputTextFolder = "./output-text";
  const fileNameWithoutExt = path.basename(pdfFilePath, ".pdf");

  await Promise.all(
    [inputPdfFolder, imagesFolder, outputTextFolder].map(fs.ensureDir)
  );

  try {
    const imageFilePaths: string[] = await convertPdfToImages(
      pdfFilePath,
      imagesFolder
    );

    deleteFile(pdfFilePath);
    logger.info(`🖼️ Converted PDF to images: ${imageFilePaths.join(", ")}`);

    if (imageFilePaths.length === 0) {
      logger.error("No images were generated from the PDF");
      return "";
    }

    //The Google Vision API starts here 

    const ocrResults = await Promise.all(
      imageFilePaths.map(async (imageFilePath): Promise<string> => {
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
  } catch (err: any) {
    logger.error(`Error processing ${pdfFilePath}:`, err);
    return "";
  }
}

async function _saveDataToTxt(
  folder: string,
  fileNameWithoutExt: string,
  text: string
): Promise<void> {
  const textPath = path.join(folder, `${fileNameWithoutExt}.txt`);

  try {
    await fs.writeFile(textPath, text, "utf8");
    logger.info(` 💚 Successfully saved the text file at: ${textPath}`);
  } catch (err: any) {
    logger.error(`Error saving the text file: ${err.message}`);
  }
}

export async function fileOcr(
  imageFilePath: string
): Promise<OcrResult | null> {
  const client = new vision.ImageAnnotatorClient(VISION_AUTH);

  logger.info(` 🕶️ Processing image with Google Vision: ${imageFilePath}`);
  try {
    const [result] = await client.documentTextDetection(imageFilePath);

    //THIS IS A TEST SPACE FOR CMR

    const document = result.fullTextAnnotation;
    const page = document?.pages?.[0];
    page?.blocks?.length ?? (() => { throw new Error('loop length not found'); })();
    
    const blocksArray:  google.cloud.vision.v1.IBlock []= [];

    page.blocks.forEach((block) => {
      blocksArray.push(block)
    })

    //Writing the res into a file:
    const outputDir = '/test_pdf_maps';
    
    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
        
    const fileContent = JSON.stringify(blocksArray, null, 2);
    
    await _saveDataToTxt(
      "./output-text",
      'all_blocks',
      fileContent
    );


    //END OF TEST SPACE FOR CMR

    const googleVisionText = result.fullTextAnnotation?.text;

    if (!googleVisionText) {
      logger.warn(`No text found in image: ${imageFilePath}`);
      return null;
    }

    logger.info(` 💚 Successfully processed image ${imageFilePath}`);
    return { googleVisionText };
  } catch (err: any) {
    logger.error(`Error during Google Vision OCR processing: ${err.message}`);
    // Instead of throwing an error, we'll just log it and continue
    return null;
  }
}
