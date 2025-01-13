import 'dotenv/config';
import { drive_v3 } from 'googleapis';
import { GoogleDriveService } from '../src/services/drive/google-api';
import { pdfOCR } from '../src/services/ocr/ocr';
import { parseOcrText } from '../src/services/openAi/invoiceJsonProcessor';
import { InvoiceDataType } from '../src/services/openAi/invoiceJsonSchema';
import { XmlService } from '../src/services/xml/xmlProcessor';
import { inputPdfFolder, PDF_FOLDER_ID, XML_FOLDER_ID } from '../src/utils/constants';
import { downloadFile } from '../src/utils/downloadFile';
import { logger } from '../src/utils/logger';

const googleDrive = new GoogleDriveService();

async function processSingleFile(
  file: drive_v3.Schema$File,
  allInvoiceData: InvoiceDataType[],
  clientName: string,
): Promise<void> {
  if (!file || !file.name || !file.id) {
    logger.warn(`Skipping file due to missing name or ID: ${JSON.stringify(file)}`);
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
    const parsedData = await parseOcrText(ocrDataText, clientName);
    logger.info('📦 Parsed JSON Schema: ', parsedData);

    allInvoiceData.push(parsedData);
  } catch (err: any) {
    logger.error(`❌ Error processing file ${file.name}: ${err?.message || err}`);
  }
}

export async function main(clientName: string, isVatPayer: boolean): Promise<string | null> {
  logger.info('🚀 Starting file processing...');
  const allInvoiceData: InvoiceDataType[] = [];
  const xmlService = new XmlService();

  try {
    const files = await googleDrive.listAllFiles(PDF_FOLDER_ID);

    if (files.length === 0) {
      logger.info('No files found to process.');
      return null;
    }

    logger.info(`Found ${files.length} file(s) to process.`);
    await Promise.all(files.map(file => processSingleFile(file, allInvoiceData, clientName)));

    if (allInvoiceData.length > 0) {
      logger.info('🔧 Converting all parsed data to XML...');
      const processedXmlData = xmlService.processDataToXml(allInvoiceData, isVatPayer);
      const xmlString = xmlService.convertPaczkaToXml(processedXmlData);

      const finalFileName = `combined_invoices.xml`;
      logger.info(`💾 Saving combined XML to file system: ${finalFileName}`);

      return xmlString;
    } else {
      logger.info('No valid invoice data to process into XML.');
      return null;
    }
  } catch (err: any) {
    logger.error(`An error occurred during file processing: ${err?.message || err}`);
    return null;
  }
}
