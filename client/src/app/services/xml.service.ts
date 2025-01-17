import { HttpClient } from '@angular/common/http';
import { Injectable, signal, inject } from '@angular/core';
import { FileSystemService } from '@ardium-ui/devkit';
import { InvoiceProcessorResponse } from 'src/environments/types';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root',
})
export class XmlService {
  private readonly http = inject(HttpService);
  private readonly fileSystemService = inject(FileSystemService);

  // Signals for state management
  public readonly isLoading = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly processedCount = signal<number>(0);
  public readonly totalFiles = signal<number>(0);

  private eventSource: EventSource | null = null;

  public sendCustomerData(clientName: string, isVatPayer: boolean): void {
    this.resetState();
    this.isLoading.set(true);

    // Initiate SSE connection
    this.eventSource = new EventSource(this.http.createUrl(`/invoice-processor?clientName=${clientName}&isVatPayer=${isVatPayer}`));

    this.eventSource.addEventListener('message', (event: MessageEvent) => {
      const data: InvoiceProcessorResponse = JSON.parse(event.data);

      // Dispatch handlers based on `status`
      switch (data.status) {
        case 'info':
          this._handleInfo(data);
          break;
        case 'progress':
          this._handleProgress(data);
          break;
        case 'success':
          this._handleSuccess(data, clientName);
          break;
        case 'error':
          this._handleError(data);
          break;
        default:
          console.warn(`Unhandled status: ${data}`);
      }
    });

    this.eventSource.addEventListener('error', () => {
      this.errorMessage.set('Connection error. Please try again.');
      this.isLoading.set(false);
      this.closeEventSource();
    });
  }

  private resetState(): void {
    this.errorMessage.set(null);
    this.processedCount.set(0);
    this.totalFiles.set(0);
  }

  private closeEventSource(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private _handleInfo(data: Extract<InvoiceProcessorResponse, { status: 'info' }>): void {
    this.totalFiles.set(data.totalFiles);
  }

  private _handleProgress(data: Extract<InvoiceProcessorResponse, { status: 'progress' }>): void {
    this.processedCount.set(data.processedCount);
    console.log(`Processed ${data.processedCount} of ${data.totalFiles}: ${data.currentFile}`);
  }

  private _handleSuccess(data: Extract<InvoiceProcessorResponse, { status: 'success' }>, clientName: string): void {
    console.log(`✅ Processing completed!`);
    this.generateXML(data.xmlString, clientName);
    this.isLoading.set(false);
    this.closeEventSource();
  }

  private _handleError(data: Extract<InvoiceProcessorResponse, { status: 'error' }>): void {
    console.error(`❌ Error: ${data.message}`);
    this.errorMessage.set(data.message);
    this.isLoading.set(false);
    this.closeEventSource();
  }

  private generateXML(xmlString: string, clientName: string): void {
    const blob = new Blob([xmlString], { type: 'application/xml' });

    this.fileSystemService.saveAs(blob, {
      method: 'crossBrowser',
      fileName: `${clientName}.xml`,
    });
  }
}
