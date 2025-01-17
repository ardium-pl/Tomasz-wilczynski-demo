export type Environment = {
  production: boolean;
  apiUrl: string;
};

export type CustomerData = {
  clientName: string; // Name of the customer
  isVatPayer: boolean; // Whether the customer is a VAT payer
};

export type BaseResponse = {
  status: 'success' | 'error' | 'info' | 'progress'; // Shared status field
  message?: string; // Optional human-readable message for additional context
};

export type ErrorResponse = BaseResponse & {
  status: 'error'; // Explicit status for errors
  message: string; // Required error message
  xmlString?: string; // Optional partial XML in case of errors
};

export type SuccessResponse = BaseResponse & {
  status: 'success'; // Explicit status for successful responses
  xmlString: string; // Required generated XML string
  message?: never; // No message is expected in a success response
};

export type ProgressResponse = BaseResponse & {
  status: 'progress'; // Explicit status for progress updates
  processedCount: number; // Number of files processed so far
  totalFiles: number; // Total number of files to process
  currentFile: string; // Name of the current file being processed
  message?: never; // No message is expected in a progress response
};

export type InfoResponse = BaseResponse & {
  status: 'info'; // Explicit status for informational messages
  totalFiles: number; // Total files found to process
  message?: string; // Optional informational message
};

export type InvoiceProcessorResponse =
  | ErrorResponse
  | SuccessResponse
  | ProgressResponse
  | InfoResponse;
