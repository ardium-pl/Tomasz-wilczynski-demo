export type Environment = {
  production: boolean;
  apiUrl: string;
};

export type CustomerData = {
  clientName: string;
  isVatPayer: boolean;
}

type ErrorResponse = {
  status: 'error';
  message: string;
  xmlString?: string;
};

type SuccessResponse = {
  status: 'success';
  message: string;
  xmlString: string;
};

export type InvoiceProcessorResponse = ErrorResponse | SuccessResponse;
