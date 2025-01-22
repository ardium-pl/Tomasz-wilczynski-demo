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

app.post("/drive/webhook", async (req, res) => {
  const channelId = req.header("X-Goog-Channel-Id");
  const resourceState = req.header("X-Goog-Resource-State");
  res.sendStatus(200);

  if (resourceState === "change" && channelId === sqlWatchData?.channelId) {
    try {
      logger.info("File change detected, adding to pending changes.");
      await handleDriveChangeNotification();
    } catch (err) {
      logger.error("Error handling Drive change:", err);
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
const updateStartPageTokenInDB = async (
  channelId: string,
  newStartPageToken: string
) => {
  const query = `
  UPDATE drive_watch
  SET saved_page_token = ?
  WHERE channel_id = ?;
  `;

  try {
    const connection = await sql.createTcpConnection();

    if (!connection) return;

    const [result] = await connection.execute(query, [
      newStartPageToken,
      channelId,
    ]);
    logger.info(
      `Updated startPageToken to ${newStartPageToken} for channelId: ${channelId}.`
    );
    return result;
  } catch (error) {
    console.error(
      `Error updating startPageToken for channelId: ${channelId}:`,
      error
    );
    throw error;
  }
};

async function handleDriveChangeNotification() {
  const drive = googleDrive.drive;

  if (!savedPageToken) {
    const { data } = await drive.changes.getStartPageToken();
    savedPageToken = data.startPageToken ?? savedPageToken;
  }
  
  const res = await drive.changes.list({
    pageToken: savedPageToken,
    fields: "*",
  });

  if (res.data.changes) {
    for (const change of res.data.changes) {
      if (change.file && change.file.parents?.includes(PDF_FOLDER_ID)) {
        // Here you can process the file directly, or run your 'main' logic:
        await main();
        break;
      }
    }
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

    // Initial Channel Setup
    if (!sqlWatchData || !sqlWatchData.expiration || sqlWatchData.expiration < Date.now()) {
      logger.info("Channel expired or missing. Setting up a new watch channel...");
      sqlWatchData = await driveWatch.watchDriveChanges();
  
      if (!sqlWatchData) {
        throw new Error("Failed to set up Drive watch channel. Exiting...");
      }
    }
  
    savedPageToken = sqlWatchData.savedPageToken;
  
    // Periodic Channel Expiry Check
    setInterval(async () => {
      try {
        if (sqlWatchData && sqlWatchData.expiration && sqlWatchData.expiration < Date.now()) {
          logger.info("Drive watch channel expired. Reinitializing...");
          
          // Reinitialize the watch channel
          const newWatchData = await driveWatch.watchDriveChanges();
          if (newWatchData) {
            sqlWatchData = newWatchData;
            savedPageToken = newWatchData.savedPageToken;
            logger.info("Drive watch channel reinitialized successfully.");
          } else {
            logger.error("Failed to reinitialize Drive watch channel.");
          }
        }
      } catch (error) {
        logger.error("Error during periodic channel expiry check:", error);
      }
    }, 60 * 1000); // Check every h10 seconds
    
});
