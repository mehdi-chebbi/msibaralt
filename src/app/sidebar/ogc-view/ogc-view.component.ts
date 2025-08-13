import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Angular Material imports
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

// Angular common imports
import { DatePipe, NgIf, NgForOf, DecimalPipe } from '@angular/common';

import Swal from 'sweetalert2'; // ✅ SweetAlert2
import { OgcService, OgcParams } from '../../services/ogc.service';
import { GeometryService } from '../../services/geometry.service'; // ✅ Add GeometryService

@Component({
  selector: 'app-ogc-view',
  standalone: true,
  imports: [
    FormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    DatePipe,
    NgIf,
    NgForOf,
  ],
  templateUrl: './ogc-view.component.html',
  styleUrls: ['./ogc-view.component.css']
})
export class OgcViewComponent {
  startDate: Date | null = null;
  endDate: Date | null = null;
  maxDate: Date = new Date();

  formats: string[] = [
    'image/png',
    'image/tiff',
  ];

  selectedFormat: string = 'image/png';

  layers = ['GEOLOGY', 'LAI_SAVI', 'MOISTURE_INDEX', 'NDVI-L2A'];
  selectedLayer: string | null = null;

  cloud_percentage: number | null = 25;

  constructor(
    private ogcService: OgcService,
    private geometryService: GeometryService // ✅ Injected
  ) {}

  onSubmit() {
    const missingFields: string[] = [];

    if (!this.startDate || !this.endDate) {
      missingFields.push('date range');
    }

    if (
      this.cloud_percentage === null ||
      this.cloud_percentage < 0 ||
      this.cloud_percentage > 100
    ) {
      missingFields.push('cloud percentage (0–100)');
    }

    if (!this.selectedLayer) {
      missingFields.push('data layer');
    }

    if (!this.geometryService.hasPolygon()) {
      missingFields.push('polygon drawing');
    }

    if (missingFields.length > 0) {
      const message = 'Please complete the following before submitting:\n\n' +
        missingFields.map(field => `• ${field}`).join('\n');

      Swal.fire({
        icon: 'warning',
        title: 'Missing or Invalid Fields',
        text: message,
        customClass: {
          popup: 'swal2-border-radius'
        }
      });
      return;
    }

    const params: OgcParams = {
      startDate: this.startDate!,
      endDate: this.endDate!,
      cloudPercentage: this.cloud_percentage!,
      selectedLayer: this.selectedLayer!,
    };

    this.ogcService.updateParams(params);

    Swal.fire({
      icon: 'success',
      title: 'Submitted!',
      text: 'Your request has been submitted successfully.',
    });
  }

  showFormatSelector = false;

  logWmsUrl() {
    let wmsUrl: string | null = this.ogcService.getWmsUrl();

    if (!wmsUrl) {
      Swal.fire({
        icon: 'warning',
        title: 'WMS URL Not Available',
        text: 'Make sure you have submitted the form and drawn a polygon.',
      });
      return;
    }

    const formatParam = `FORMAT=${encodeURIComponent(this.selectedFormat)}`;
    if (wmsUrl.includes('FORMAT=')) {
      wmsUrl = wmsUrl.replace(/FORMAT=[^&]+/, formatParam);
    } else {
      wmsUrl += (wmsUrl.includes('?') ? '&' : '?') + formatParam;
    }

    console.log('Final WMS URL:', wmsUrl);

    if (this.selectedFormat === 'image/tiff') {
      console.log('Opening TIFF in new tab...');
      window.open(wmsUrl, '_blank');
    } else if (this.selectedFormat === 'image/png') {
      console.log('Starting PNG download...');

      Swal.fire({
        title: 'Downloading image...',
        text: 'Please wait while the PNG is being downloaded.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      fetch(wmsUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          console.log('Download complete. Creating blob...');
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'wms-image.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          Swal.close();
          console.log('PNG download triggered.');
        })
        .catch(error => {
          console.error('PNG download failed:', error);
          Swal.fire({
            icon: 'error',
            title: 'Download Failed',
            text: 'There was an error downloading the PNG image.',
          });
        });
    } else {
      console.warn('Unsupported format:', this.selectedFormat);
    }
  }
}
