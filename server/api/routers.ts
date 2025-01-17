import express, { Request, Response } from 'express';
import { logger } from '../src/utils/logger.js';
import { main, processSingleFile } from './main';
import { InvoiceProcessorResponse } from '../src/utils/types';
import { InvoiceDataType } from '../src/services/openAi/invoiceJsonSchema.js';
import { XmlService } from '../src/services/xml/xmlProcessor.js';
import { PDF_FOLDER_ID } from '../src/utils/constants.js';
import { GoogleDriveService } from '../src/services/drive/google-api.js';
import { sleep } from '../src/utils/xmlProcessor.js';
import { log } from 'winston';

export const invoiceProcessorRouter: any = express.Router();
const googleDrive = new GoogleDriveService();

invoiceProcessorRouter.get(
  '/api/invoice-processor',
  async (req: Request, res: Response<InvoiceProcessorResponse>): Promise<void> => {
    const { clientName } = req.query;
    const isVatPayer = req.query.isVatPayer === 'true';

    if (typeof clientName !== 'string' || (req.query.isVatPayer !== 'true' && req.query.isVatPayer !== 'false')) {
      logger.error('Invalid request body format');
      res.status(400).json({
        status: 'error',
        message: "Invalid request body. 'clientName' must be a string and 'isVatPayer' must be a boolean.",
      });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      logger.info(`Received request with clientName: ${clientName}, isVatPayer: ${isVatPayer}`);

      const files = await googleDrive.listAllFiles(PDF_FOLDER_ID);
      const totalFiles = files.length;

      res.write(`data: ${JSON.stringify({ status: 'info', totalFiles })}\n\n`);

      if (totalFiles === 0) {
        res.write(`data: ${JSON.stringify({ status: 'info', message: 'No files to process.' })}\n\n`);
        res.end();
        return;
      }

      let processedCount = 0;
      const allInvoiceData: InvoiceDataType[] = [];

      await Promise.all(
        files.map(async (file, index) => {
          try {
            await processSingleFile(file, allInvoiceData, clientName);
            processedCount++;

            // Send progress update for each processed file
            res.write(
              `data: ${JSON.stringify({
                status: 'progress',
                processedCount,
                totalFiles: files.length,
                currentFile: file.name,
              })}\n\n`
            );

            if (index < files.length - 1) {
              await sleep(500);
            }
          } catch (err: any) {
            logger.error(`Error processing file ${file.name}: ${err.message}`);
          }
        })
      );

      if (allInvoiceData.length > 0) {
        const xmlService = new XmlService();
        const processedXmlData = xmlService.processDataToXml(allInvoiceData, isVatPayer);
        const xmlString = xmlService.convertPaczkaToXml(processedXmlData);

        res.write(
          `data: ${JSON.stringify({
            status: 'success',
            message: 'Invoice processing completed successfully.',
            xmlString,
          })}\n\n`
        );
      } else {
        res.write(
          `data: ${JSON.stringify({
            status: 'info',
            message: 'No valid invoice data to process into XML.',
          })}\n\n`
        );
      }
    } catch (err: any) {
      logger.error(`Error occurred in invoice processing: ${err.message}`);
      res.write(
        `data: ${JSON.stringify({
          status: 'error',
          message: 'An error occurred during invoice processing.',
        })}\n\n`
      );
    } finally {
      res.end();
    }
  }
);
