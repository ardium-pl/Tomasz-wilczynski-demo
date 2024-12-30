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
import { sql } from "googleapis/build/src/apis/sql/index";

const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(express.json());
app.use(cors());

let savedPageToken: string | null = null;

// Webhook endpoint
app.post("/drive/webhook", async (req, res) => {
  const channelId = req.header("X-Goog-Channel-Id");
  const resourceState = req.header("X-Goog-Resource-State");
  const resourceId = req.header("X-Goog-Resource-Id");
  const messageNumber = req.header("X-Goog-Message-Number");

  const driveWatch = new GoogleDriveService();
  const sqlWatchData = await driveWatch.getChannelIdAndStartPageToken();

  console.log("Received Drive webhook notification:", {
    channelId,
    resourceState,
    resourceId,
    messageNumber,
  });

  // Acknowledge the webhook quickly
  res.sendStatus(200);

  if (resourceState === "change" && channelId == sqlWatchData?.channelId) {
    try {
      logger.info("🔔 Received Drive change notification. Processing...");
      // await handleDriveChangeNotification();
    } catch (err) {
      console.error("Error handling Drive change:", err);
    }
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
  logger.info("[handleDriveChangeNotification] Entered function.");

  const drive = googleDrive.drive;
  logger.info("[handleDriveChangeNotification] Drive client initialized.");

  // Check if we already have a saved page token
  logger.info("[handleDriveChangeNotification] Checking savedPageToken:", savedPageToken);
  if (!savedPageToken) {
    logger.info("[handleDriveChangeNotification] No savedPageToken found. Fetching fresh token...");
    const { data } = await drive.changes.getStartPageToken();
    if (!data.startPageToken) {
      logger.error("[handleDriveChangeNotification] No startPageToken found; cannot process changes.");
      return;
    }
    savedPageToken = data.startPageToken;
    logger.info("[handleDriveChangeNotification] Fetched new startPageToken:", savedPageToken);
  }

  logger.info("[handleDriveChangeNotification] Listing changes with pageToken:", savedPageToken);
  const res = await drive.changes.list({ 
    pageToken: savedPageToken,
    fields: "*"
  });

  logger.info("[handleDriveChangeNotification] changes.list response:", res.data);

  if (res.data.changes) {
    logger.info(`[handleDriveChangeNotification] Found ${res.data.changes.length} change(s).`);
    for (const change of res.data.changes) {
      logger.info(`[handleDriveChangeNotification] Processing change:`, change);
      logger.info(`Folder: ${change.file?.parents}, File: ${change.file?.name}`);
      if (change.file && change.file.parents?.includes(PDF_FOLDER_ID)) {
        logger.info("[handleDriveChangeNotification] New file detected in PDF folder:", change.file.name);
        
        // Here you can process the file directly, or run your 'main' logic:
        logger.info("[handleDriveChangeNotification] Calling main() to re-process the PDF folder.");
        await main();
      } else {
        logger.info("[handleDriveChangeNotification] Change is not in PDF_FOLDER_ID or file is null. Skipping.");
      }
    }
  } else {
    logger.info("[handleDriveChangeNotification] No changes returned from the Drive changes list.");
  }

  if (res.data.newStartPageToken) {
    logger.info("[handleDriveChangeNotification] Updating savedPageToken to:", res.data.newStartPageToken);
    savedPageToken = res.data.newStartPageToken;
  }

  logger.info("[handleDriveChangeNotification] Completed processing changes.\n");
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
logger.info(`Starting server...`);
app.listen(PORT, async () => {
  logger.info(`Running on port ${ansis.greenBright.underline(String(PORT))}!`);
  await googleDrive.watchDriveChanges();
});
