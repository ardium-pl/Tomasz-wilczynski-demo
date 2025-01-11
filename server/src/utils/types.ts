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