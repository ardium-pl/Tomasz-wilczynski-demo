import vision from '@google-cloud/vision';
import fs from 'fs-extra';
import path from 'path';
import { convertPdfToImages } from '../../utils/convertPdfToImage';
import { deleteFile } from '../../utils/deleteFile';
import { logger } from '../../utils/logger';
import { imagesFolder, inputPdfFolder, outputTextFolder, VISION_AUTH } from '../../utils/constants';

export async function pdfOCR(pdfFilePath: string): Promise<string> {
  const fileNameWithoutExt = path.basename(pdfFilePath, '.pdf');

  await Promise.all([inputPdfFolder, imagesFolder, outputTextFolder].map(fs.ensureDir));

  try {
    const imageFilePaths: string[] = await convertPdfToImages(pdfFilePath, imagesFolder);

    deleteFile(pdfFilePath);
    logger.info(`🖼️ Converted PDF to images: ${imageFilePaths.join(', ')}`);

    if (imageFilePaths.length === 0) {
      logger.error('No images were generated from the PDF');
      return '';
    }

    const ocrResults = await Promise.all(
      imageFilePaths.map(async (imageFilePath): Promise<string> => {
        const ocrResult = await fileOcr(imageFilePath);
        if (ocrResult) {
          return ocrResult;
        } else {
          logger.warn(`No text found in image: ${imageFilePath}`);
          return '';
        }
      })
    );

    const concatenatedResults = ocrResults.join('\n');

    await _saveDataToTxt(outputTextFolder, fileNameWithoutExt, concatenatedResults);

    logger.info(` 💚 Successfully processed and saved the OCR results for ${pdfFilePath}`);

    // Delete the image files after processing
    for (const imageFilePath of imageFilePaths) {
      logger.warn(`Deleting temporary image: ${imageFilePath}`);
      deleteFile(imageFilePath);
    }

    return concatenatedResults;
  } catch (err: any) {
    logger.error(`Error processing ${pdfFilePath}:`, err);
    return '';
  }
}

export async function _saveDataToTxt(folder: string, fileNameWithoutExt: string, text: string): Promise<void> {
  const textPath = path.join(folder, `${fileNameWithoutExt}.txt`);

  try {
    await fs.writeFile(textPath, text, 'utf8');
    logger.info(` 💚 Successfully saved the text file at: ${textPath}`);
  } catch (err: any) {
    logger.error(`Error saving the text file: ${err.message}`);
  }
}

export async function fileOcr(imageFilePath: string): Promise<string> {
  const client = new vision.ImageAnnotatorClient(VISION_AUTH);

  logger.info(` 🕶️ Processing image with Google Vision: ${imageFilePath}`);
  try {
    const [result] = await client.documentTextDetection(imageFilePath);

    const googleVisionText = result.fullTextAnnotation?.text;

    if (!googleVisionText) {
      logger.warn(`No text found in image: ${imageFilePath}`);
      return '';
    }

    logger.info(` 💚 Successfully processed image ${imageFilePath}`);
    return googleVisionText;
  } catch (err: any) {
    logger.error(`Error during Google Vision OCR processing: ${err.message}`);
    return '';
  }
}
