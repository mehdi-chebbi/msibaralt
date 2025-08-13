import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Angular Material imports
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Angular common imports
import { DatePipe, NgIf, NgForOf, DecimalPipe } from '@angular/common';

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
    MatSnackBarModule,
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

  downloading = false;

  constructor(
    private ogcService: OgcService,
    private geometryService: GeometryService,
    private snackBar: MatSnackBar
  ) {}

  onSubmit() {
    const missingFields: string[] = [];

    if (!this.startDate || !this.endDate) missingFields.push('date range');
    if (this.cloud_percentage === null || this.cloud_percentage < 0 || this.cloud_percentage > 100) missingFields.push('cloud percentage (0–100)');
    if (!this.selectedLayer) missingFields.push('data layer');
    if (!this.geometryService.hasPolygon()) missingFields.push('polygon drawing');

    if (missingFields.length > 0) {
      this.snackBar.open(`Please complete: ${missingFields.join(', ')}`, 'Close', { duration: 3000 });
      return;
    }

    const params: OgcParams = {
      startDate: this.startDate!,
      endDate: this.endDate!,
      cloudPercentage: this.cloud_percentage!,
      selectedLayer: this.selectedLayer!,
    };

    this.ogcService.updateParams(params);
    this.snackBar.open('Submitted successfully', '', { duration: 1500 });
  }

  showFormatSelector = false;

  logWmsUrl() {
    let wmsUrl: string | null = this.ogcService.getWmsUrl();

    if (!wmsUrl) {
      this.snackBar.open('WMS URL not available. Submit and draw a polygon first.', 'Close', { duration: 2500 });
      return;
    }

    const formatParam = `FORMAT=${encodeURIComponent(this.selectedFormat)}`;
    if (wmsUrl.includes('FORMAT=')) {
      wmsUrl = wmsUrl.replace(/FORMAT=[^&]+/, formatParam);
    } else {
      wmsUrl += (wmsUrl.includes('?') ? '&' : '?') + formatParam;
    }

    if (this.selectedFormat === 'image/tiff') {
      window.open(wmsUrl, '_blank');
    } else if (this.selectedFormat === 'image/png') {
      this.downloading = true;
      fetch(wmsUrl)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error ${response.status}`);
          return response.blob();
        })
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'wms-image.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this.snackBar.open('PNG downloaded', '', { duration: 1500 });
        })
        .catch(error => {
          console.error('PNG download failed:', error);
          this.snackBar.open('Download failed. Try again later.', 'Close', { duration: 2500 });
        })
        .finally(() => this.downloading = false);
    } else {
      console.warn('Unsupported format:', this.selectedFormat);
    }
  }
}
