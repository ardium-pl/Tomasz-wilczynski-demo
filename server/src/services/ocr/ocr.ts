import vision, { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs-extra';
import path from 'path';
import { convertPdfToImages } from '../../utils/convertPdfToImage';
import { deleteFile } from '../../utils/deleteFile';
import { logger } from '../../utils/logger';
import { imagesFolder, inputPdfFolder, outputTextFolder, VISION_AUTH } from '../../utils/constants';

export class OcrProcessor {
  private client: ImageAnnotatorClient;

  constructor() {
    this.client = new vision.ImageAnnotatorClient(VISION_AUTH);
  }

  public processPdf = async (pdfFilePath: string): Promise<string> =>{

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
        imageFilePaths.map(async (imageFilePath) => {
            console.log(`🔠 Processing image: ${imageFilePath}`);
            return await this.fileOcr(imageFilePath);
        })
    );
      const concatenatedResults = ocrResults.join('\n');


      logger.info(` 💚 Successfully processed and saved the OCR results for ${pdfFilePath}`);

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

  public processImage = async (imageFilePath: string): Promise<string> =>{
    logger.info(` 🕶️ Processing image with Google Vision: ${imageFilePath}`);

    try {
      const googleVisionText = this.fileOcr(imageFilePath);
      deleteFile(imageFilePath);

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

  public async saveDataToTxt(folder: string, fileNameWithoutExt: string, text: string): Promise<void> {
    const textPath = path.join(folder, `${fileNameWithoutExt}.txt`);

    try {
      await fs.writeFile(textPath, text, 'utf8');
      logger.info(` 💚 Successfully saved the text file at: ${textPath}`);
    } catch (err: any) {
      logger.error(`Error saving the text file: ${err.message}`);
    }
  }

  public fileOcr = async (imageFilePath: string): Promise<string> => {
    logger.info(` 🕶️ Processing image with Google Vision: ${imageFilePath}`);

    try {
      const [result] = await this.client.documentTextDetection(imageFilePath);

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
}
