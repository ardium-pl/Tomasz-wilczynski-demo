import vision from "@google-cloud/vision";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { convertPdfToImages } from "../../utils/convertPdfToImage.js";
import { deleteFile } from "../../utils/deleteFile.js";
import { logger } from "../../utils/logger.js";

dotenv.config();

const VISION_AUTH = {
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handling the private key newline issue
    },
};

export async function pdfOCR(pdfFilePath) {
    const inputPdfFolder = "./input-pdf";
    const imagesFolder = "./images";
    const outputTextFolder = "./output-text";

    [inputPdfFolder, imagesFolder, outputTextFolder].forEach((folder) => {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
    });

    try {
        const imageFilePaths = await convertPdfToImages(pdfFilePath, imagesFolder);
        logger.info(`🖼️ Converted PDF to images: ${imageFilePaths.join(", ")}`);

        if (imageFilePaths.length === 0) {
            logger.error("No images were generated from the PDF");
            return [];
        }

        const allResults = [];
        for (const imageFilePath of imageFilePaths) {
            const ocrResults = await fileOcr(imageFilePath, outputTextFolder);
            allResults.push(...ocrResults); // Append each image's OCR result
        }

        // Concatenate all OCR results into a single string
        const concatenatedResults = allResults
            .map((result) => result.googleVisionText)
            .join("\n");

        // Save the concatenated OCR result to a single text file
        const savePdfData = (folder, text) => {
            const fileNameWithoutExt = path.basename(pdfFilePath, ".pdf");
            const textPath = path.join(folder, `${fileNameWithoutExt}.txt`);
            fs.writeFileSync(textPath, text, "utf8");
        };

        savePdfData(outputTextFolder, concatenatedResults);

        logger.info(` 💚 Successfully processed and saved the OCR results for ${pdfFilePath}`);

        // Delete the image files after processing
        for (const imageFilePath of imageFilePaths) {
            logger.warn(`Deleting temporary image: ${imageFilePath}`);
            deleteFile(imageFilePath);
        }

        return concatenatedResults;
    } catch (err) {
        logger.error(`Error processing ${pdfFilePath}:`, err);
        throw err;
    }
}

export async function fileOcr(imageFilePath) {
    const client = new vision.ImageAnnotatorClient(VISION_AUTH);
    const results = [];

    logger.info(` 🕶️ Processing image with Google Vision: ${imageFilePath}`);
    try {
        const [result] = await client.documentTextDetection(imageFilePath);

        // Getting text from the image
        let googleVisionText = "";
        if (result.fullTextAnnotation) {
            googleVisionText = result.fullTextAnnotation.text + "\n";
            results.push({ googleVisionText });
        }

        logger.info(` 💚 Successfully processed image ${imageFilePath}`);
    } catch (err) {
        logger.error(`Error during Google Vision OCR processing: ${err.message}`);
        throw err;
    }

    return results;
}
