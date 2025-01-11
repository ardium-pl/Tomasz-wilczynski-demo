import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { InvoiceProcessorResponse } from 'src/environments/types';
import * as xmljs from 'xml-js';
import { FileSystemService } from '@ardium-ui/devkit';

@Injectable({
  providedIn: 'root',
})
export class XmlService {
  private readonly http = inject(HttpClient);
  private readonly fileSystemService = inject(FileSystemService);

  generateXML(xmlString: string, clientName: string): void {
    const blob = new Blob([xmlString], { type: 'application/xml' });

    this.fileSystemService.saveAs(blob, {
      fileName: `${clientName}.xml`,
      types: [{ description: 'Plik XML', accept: { 'application/xml': ['.xml'] } }],
    });
  }

  sendCustomerData(clientName: string, isVatPayer: boolean): void {
    this.http
      .post<InvoiceProcessorResponse>('http://localhost:8080/api/invoice-processor', {
        clientName: clientName,
        isVatPayer: isVatPayer,
      })
      .subscribe({
        next: res => {
          if (res.status === 'success') {
            console.log(`✅ Verification successful!`);
            this.generateXML(res.xmlString, clientName);
          }
        },
        error: err => {
          console.log('❌ Error performing the http request, error message:', err);
        },
      });
  }
}
