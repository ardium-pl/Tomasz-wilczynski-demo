import ansis from "ansis";
import cors from "cors";
import "dotenv/config";
import express from "express";
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
import { MySqlService } from "./src/services/db/mySql.ts";
import { WatchDrive } from "./src/utils/allTypes.ts";

const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(express.json());
app.use(cors());

const driveWatch = new GoogleDriveService();
const sql = new MySqlService();
let sqlWatchData: WatchDrive | null = await driveWatch.watchDriveChanges();

if (!sqlWatchData || !sqlWatchData.expiration || sqlWatchData.expiration < Date.now()) {
  logger.info("Channel expired or missing. Setting up a new watch channel...");
  sqlWatchData = await driveWatch.watchDriveChanges();

  if (!sqlWatchData) {
    throw new Error("Failed to set up Drive watch channel. Exiting...");
  }
}

let savedPageToken: string | undefined = sqlWatchData.savedPageToken;
let debounceTimer: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 20000;
const pendingChanges = new Set<string>();

app.post("/drive/webhook", (req, res) => {
  res.sendStatus(200);

  const channelId = req.header("X-Goog-Channel-Id");
  const resourceState = req.header("X-Goog-Resource-State");
  
  // Skip if resourceState is not 'change', or if channel doesn't match
  if (resourceState !== "change") {
    logger.info(`Ignoring resourceState = ${resourceState}.`);
    return;
  }
  if (channelId !== sqlWatchData?.channelId) {
    logger.info(`Ignoring unknown channelId = ${channelId}.`);
    return;
  }

  // If we get here, it’s a real "change" for our known channel
  handleDriveChangeNotification().catch((err) => {
    logger.error("Error handling Drive change:", err);
  });
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

async function updateStartPageTokenInDB(channelId: string, newStartPageToken: string) {
  const query = `
    UPDATE drive_watch
    SET saved_page_token = ?
    WHERE channel_id = ?;
  `;

  try {
    const sqlService = new MySqlService();
    const connection = await sqlService.createTcpConnection();
    if (!connection) {
      throw new Error("No DB connection");
    }

    const [result] = await connection.execute(query, [
      newStartPageToken,
      channelId,
    ]);
    logger.info(
      `Updated startPageToken to ${newStartPageToken} for channelId: ${channelId}`
    );
    return result;
  } catch (err) {
    logger.error(
      `Error updating startPageToken for channelId ${channelId}: ${err}`
    );
    throw err;
  }
}

async function handleDriveChangeNotification() {
  const drive = googleDrive.drive;

  if (!savedPageToken) {
    const { data } = await drive.changes.getStartPageToken();
    savedPageToken = data.startPageToken ?? savedPageToken;
  }
  
  //Changed this to relevant changes only
  const res = await drive.changes.list({
    pageToken: savedPageToken,
    fields: "changes(file(id, name, parents)), newStartPageToken",
  });

  const relevantChanges = (res.data.changes || []).filter(
    (change) =>
      change.file &&
      change.file.parents?.includes(PDF_FOLDER_ID) &&
      !change.removed
  );

  if (relevantChanges.length === 0) {
    logger.info("No relevant changes found. Skipping processing.");
  } else {
    // We have at least one changed file in PDF_FOLDER_ID
    await processChangedFiles(relevantChanges);
  }

  const newStartPageToken = res.data.newStartPageToken;
  if (newStartPageToken) {
    try {
      if (!sqlWatchData) return;
      await updateStartPageTokenInDB(sqlWatchData.channelId, newStartPageToken);
    } catch (err) {
      console.error("Failed to update startPageToken in the database:", err);
    }
    savedPageToken = newStartPageToken;
  }
}

async function processChangedFiles(changes: drive_v3.Schema$Change[]) {
  logger.info("🚀 Starting file processing for changed PDF(s)...");
  const allInvoiceData: InvoiceDataType[] = [];
  const xmlService = new XmlService();

  for (const change of changes) {
    const file = change.file;
    if (!file || !file.id || !file.name) {
      logger.warn(`Skipping file due to missing name/ID: ${JSON.stringify(file)}`);
      continue;
    }

    try {
      // 1) Download the PDF
      logger.info(`🧾 Downloading PDF: ${file.name}`);
      const pdfFilePath = await downloadFile(file.id, inputPdfFolder, file.name);
      logger.info(`🧾 PDF downloaded to: ${pdfFilePath}`);

      // 2) Perform OCR on the PDF
      logger.info(`🔍 Performing OCR on PDF: ${file.name}`);
      const ocrDataText = await pdfOCR(pdfFilePath);
      logger.info(`📄 OCR Extracted Text (truncated): ${ocrDataText.slice(0, 200)}...`);

      // 3) Parse OCR text into JSON
      logger.info(`🧩 Parsing OCR text into JSON schema: ${file.name}`);
      const parsedData = await parseOcrText(ocrDataText);
      logger.info("📦 Parsed JSON: ", parsedData);

      // Collect parsed data for XML
      allInvoiceData.push(parsedData);
    } catch (err: any) {
      logger.error(`❌ Error processing file ${file.name}: ${err?.message || err}`);
    }
  }

  // If any invoice data was processed, generate and upload XML
  if (allInvoiceData.length > 0) {
    try {
      // 4) Convert combined invoices into XML
      logger.info("📑 Converting invoice data to XML...");
      const processedXmlData = xmlService.processDataToXml(allInvoiceData);
      const xmlString = xmlService.convertPaczkaToXml(processedXmlData);

      // 5) Save XML to local disk
      const finalFileName = `combined_invoices.xml`;
      const xmlFilePath = xmlService.saveXmlToFile(xmlString, finalFileName);
      logger.info(`🗂️ XML file saved to: ${xmlFilePath}`);

      // 6) Upload the XML file to Google Drive
      logger.info(`📤 Uploading XML file: ${finalFileName} to folder: ${XML_FOLDER_ID}...`);
      await new GoogleDriveService().uploadFile(XML_FOLDER_ID, finalFileName, xmlFilePath);

      logger.info("✅ Combined XML file uploaded successfully.");
    } catch (uploadErr: any) {
      logger.error("❌ Error uploading combined XML:", uploadErr?.message || uploadErr);
    }
  }
}

// Startup
logger.info(`Starting server...`);

app.listen(PORT, async () => {
  logger.info(`Running on port: ${PORT}! `);

  if(sqlWatchData){
    logger.info(sqlWatchData.channelId);
    logger.info(sqlWatchData.resourceId);
    logger.info(sqlWatchData.savedPageToken);
    logger.info(sqlWatchData.expiration);
  }

    // Initial Channel Setup
// Only on server start
if (!sqlWatchData || !sqlWatchData.expiration || sqlWatchData.expiration < Date.now()) {
  logger.info("No valid channel; creating new watch channel...");
  sqlWatchData = await driveWatch.watchDriveChanges();
} else {
  logger.info("Reusing existing watch channel from DB...");
}

// Then periodically check but maybe once per hour
setInterval(async () => {
  if (!sqlWatchData) return;
  const now = Date.now();
  // Re-init if we are within, say, 5 minutes of expiration
  if (sqlWatchData.expiration && sqlWatchData.expiration < now + 1000 * 60 * 5) {
    logger.info("Channel is about to expire - reinitializing watch...");
    sqlWatchData = await driveWatch.watchDriveChanges();
  }
}, 1000 * 60 * 60); // check once per hour
    
});
