import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { saveAs } from 'file-saver';
import { finalize } from 'rxjs';
import { InvoiceProcessorResponse } from 'src/environments/types';

@Injectable({
  providedIn: 'root',
})
export class XmlService {
  private readonly http = inject(HttpClient);
  public readonly isLoading = signal<boolean>(false);

  private generateXML(xmlString: string, clientName: string): void {
    const blob = new Blob([xmlString], { type: 'application/xml' });

    saveAs(blob, `${clientName}.xml`);
  }

  public async sendCustomerData(clientName: string, isVatPayer: boolean): Promise<void> {
    this.isLoading.set(true);
    this.http
      .post<InvoiceProcessorResponse>('https://tomasz-wilczynski-demo-development.up.railway.app/api/invoice-processor', {
        clientName: clientName,
        isVatPayer: isVatPayer,
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: res => {
          if (res.status === 'success') {
            console.log(`✅ Verification successful!`);
            this.generateXML(res.xmlString, clientName);
            this.isLoading.set(false)
          }
        },
        error: err => {
          console.log('❌ Error performing the http request, error message:', err);
          this.isLoading.set(false)
        },
      });
  }
}
