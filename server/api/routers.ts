import express, { Request, Response } from 'express';
import { logger } from '../src/utils/logger';
import { main } from './main';
import { InvoiceProcessorResponse } from '../src/utils/types';

export const invoiceProcessorRouter = express.Router();


invoiceProcessorRouter.post('/api/invoice-processor', async (req: Request, res: Response<InvoiceProcessorResponse>): Promise<void> => {
  const { clientName, isVatPayer } = req.body;

  if (typeof clientName !== 'string' || typeof isVatPayer !== 'boolean') {
    logger.error('Invalid request body format');
    res.status(400).json({
      status: 'error',
      message: "Invalid request body. 'clientName' must be a string and 'isVatPayer' must be a boolean.",
    });
    return;
  }

  try {
    logger.info(`Received request with clientName: ${clientName}, isVatPayer: ${isVatPayer}`);

    // Pass the body to the main function (modify main to accept these parameters if needed)
    const xmlString = await main(clientName, isVatPayer);
    
    if(!xmlString) return;

    res.status(200).json({
      status: 'success',
      message: 'Invoice processing completed successfully.',
      xmlString: xmlString,
    });
  } catch (err: any) {
    logger.error(`Error occurred in invoice processing: ${err.message}`);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during invoice processing.',
      xmlString: 'Wystąpił błąd podczas przetwarzania faktur.',
    });
  }
});
