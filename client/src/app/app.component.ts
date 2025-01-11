import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { XmlService } from '@services/xml.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  public readonly customerData = new FormGroup({
    clientName: new FormControl<string>('', Validators.required),
    isVatPayer: new FormControl<boolean>(false, Validators.required),
  });

  private readonly xmlService = new XmlService();

  generateXml(): void {
    if (this.customerData.valid) {
      if (!this.customerData.value.clientName || !this.customerData.value.isVatPayer)
        return console.error(
          'Either client name or VAT payer status is missing.',
          'clientName: ',
          this.customerData.value.clientName,
          'isVatPayer: ',
          this.customerData.value.isVatPayer
        );

      this.xmlService.sendCustomerData(this.customerData.value.clientName, this.customerData.value.isVatPayer);
      
    } else {
      console.log('Form is invalid.');
    }
  }
}
