import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { XmlService } from '@services/xml.service';

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss',
})
export class MainPageComponent {
  public readonly customerData = new FormGroup({
    clientName: new FormControl<string>('', Validators.required),
    isVatPayer: new FormControl<boolean>(false),
  });

  public readonly xmlService = new XmlService();

  async generateXml(): Promise<void> {
    if (this.customerData.valid) {
      if (!this.customerData.value.clientName) {
        return console.error('Client name is missing.', 'clientName:', this.customerData.value.clientName);
      }
      try {
        await this.xmlService.sendCustomerData(
          this.customerData.value.clientName,
          this.customerData.value.isVatPayer ?? false
        );
      } catch (error) {
        console.error('Error in generateXml:', error);
      }
    } else {
      console.log('Form is invalid.');
    }
  }
}
