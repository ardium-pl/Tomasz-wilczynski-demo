import "dotenv/config";
import ansis from 'ansis';
import cors from 'cors';
import express from 'express';
import { drive_v3 } from "googleapis";
import { GoogleDriveService } from "./src/services/drive/google-api.ts";
import { pdfOCR } from "./src/services/ocr/ocr.ts";
import { parseOcrText } from "./src/services/openAi/invoiceJsonProcessor.ts";
import { InvoiceDataType } from "./src/services/openAi/invoiceJsonSchema.ts";
import { XmlService } from "./src/services/xml/xmlProcessor.ts";
import {
  inputPdfFolder,
  PDF_FOLDER_ID,
  XML_FOLDER_ID,
} from "./src/utils/constants.ts";
import { downloadFile } from "./src/utils/downloadFile.ts";
import { logger } from "./src/utils/logger.ts";

const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(express.json());
app.use(cors());

app.post("/drive/webhook", (req, res) => {
  const channelId = req.header("X-Goog-Channel-Id");
  const resourceState = req.header("X-Goog-Resource-State");
  const resourceId = req.header("X-Goog-Resource-Id");
  const messageNumber = req.header("X-Goog-Message-Number");

  console.log("Received Drive webhook notification:", {
    channelId,
    resourceState,
    resourceId,
    messageNumber
  });

  // Always respond quickly to avoid timeouts
  res.sendStatus(200);

  // resourceState can be "change", "sync", etc.
  // If it's a 'change', we can fetch the latest changes from the changes feed
  if (resourceState === "change") {
    handleDriveChangeNotification()
      .catch((err) => console.error("Error handling Drive change:", err));
  }
});

const googleDrive = new GoogleDriveService();

async function processSingleFile(
  file: drive_v3.Schema$File,
  allInvoiceData: InvoiceDataType[]
): Promise<void> {
  if (!file || !file.name || !file.id) {
    logger.warn(
      `Skipping file due to missing name or ID: ${JSON.stringify(file)}`
    );
    return;
  }

  try {
    logger.info(`🧾 Downloading PDF: ${file.name}`);
    const pdfFilePath = await downloadFile(file.id, inputPdfFolder, file.name);
    logger.info(`🧾 PDF downloaded to: ${pdfFilePath}`);

    logger.info(`🔍 Performing OCR on PDF: ${file.name}`);
    const ocrDataText = await pdfOCR(pdfFilePath);
    logger.info(`📄 OCR Extracted Text: ${ocrDataText}`);

    logger.info(`🧩 Parsing OCR text into JSON schema: ${file.name}`);
    const parsedData = await parseOcrText(ocrDataText);
    logger.info("📦 Parsed JSON Schema: ", parsedData);

    allInvoiceData.push(parsedData);
  } catch (err: any) {
    logger.error(
      `❌ Error processing file ${file.name}: ${err?.message || err}`
    );
  }
}


async function handleDriveChangeNotification() {
  const drive = googleDrive.drive;

  // Assume we have savedPageToken stored somewhere
  let savedPageToken = "SAVED_PAGE_TOKEN";

  const res = await drive.changes.list({ 
    pageToken: savedPageToken,
    fields: "*"
  });

  if (res.data.changes) {
    for (const change of res.data.changes) {
      if (change.file && change.file.parents?.includes(PDF_FOLDER_ID)) {
        // This means a new file was uploaded or changed in the PDF folder
        console.log("New file detected:", change.file.name);
        const file = change.file; // drive_v3.Schema$File
        await main();
      }
    }
  }

  if (res.data.newStartPageToken) {
    savedPageToken = res.data.newStartPageToken;
  }
}

async function main(): Promise<void> {
  logger.info("🚀 Starting file processing...");
  const allInvoiceData: InvoiceDataType[] = [];
  const xmlService = new XmlService();

  try {
    const files = await googleDrive.listAllFiles(PDF_FOLDER_ID);

    if (files.length === 0) {
      logger.info("No files found to process.");
      return;
    }

    logger.info(`Found ${files.length} file(s) to process.`);
    await Promise.all(
      files.map((file) => processSingleFile(file, allInvoiceData))
    );

    if (allInvoiceData.length > 0) {
      logger.info("🔧 Converting all parsed data to XML...");
      const processedXmlData = xmlService.processDataToXml(allInvoiceData);
      const xmlString = xmlService.convertPaczkaToXml(processedXmlData);

      const finalFileName = `combined_invoices.xml`;
      logger.info(`💾 Saving combined XML to file system: ${finalFileName}`);
      const xmlFilePath = xmlService.saveXmlToFile(xmlString, finalFileName);

      logger.info(
        `☁️ Uploading combined XML file (${finalFileName}) to Google Drive`
      );
      await googleDrive.uploadFile(XML_FOLDER_ID, finalFileName, xmlFilePath);
      logger.info(`✅ Combined XML file uploaded successfully.`);
    } else {
      logger.info("No valid invoice data to process into XML.");
    }
  } catch (err: any) {
    logger.error(
      `An error occurred during file processing: ${err?.message || err}`
    );
  }
}
// Startup
console.log(`Starting server...`);
app.listen(PORT, () => {
  console.log(`Running on port ${ansis.greenBright.underline(String(PORT))}!`);
});
