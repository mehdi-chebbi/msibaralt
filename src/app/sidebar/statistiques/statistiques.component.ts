import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import Swal from 'sweetalert2';

import { CommonModule } from '@angular/common';
import { GeometryService } from '../../services/geometry.service';
import * as L from 'leaflet';

import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartDataset } from 'chart.js';

@Component({
  selector: 'app-statistiques',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    NgChartsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './statistiques.component.html',
  styleUrls: ['./statistiques.component.css']
})
export class StatistiquesComponent {
  startDate: Date | null = null;
  endDate: Date | null = null;
  maxDate: Date = new Date();
  layers = ['NDVI', 'NDWI'];
  selectedLayers: string[] = [];

  reducers = [
    { label: 'Mean', value: 'mean' },
    { label: 'Min', value: 'min' },
    { label: 'Max', value: 'max' },
    { label: 'Standard Deviation', value: 'std' }
  ];
  selectedReducers: string[] = [];

  drawnBounds: L.LatLngBounds | null = null;

  loading = false;

  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
      maintainAspectRatio: false,   // <--- add this line
    plugins: {
      legend: {
        labels: {
          color: 'white'
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#333',
        titleColor: 'white',
        bodyColor: 'white'
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'white'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.2)'
        }
      },
      y: {
        min: -1,
        max: 1,
        beginAtZero: false,
        ticks: {
          color: 'white'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.2)'
        }
      }
    }
  };

  constructor(
    private geometryService: GeometryService,
    private http: HttpClient
  ) {
    this.geometryService.bounds$.subscribe(bounds => {
      this.drawnBounds = bounds;
      if (bounds) {
        console.log('✅ Polygon bounds received in StatistiquesComponent:', bounds);
      }
    });
  }

  onLayerToggle(layer: string, isChecked: boolean): void {
    if (isChecked) {
      if (!this.selectedLayers.includes(layer)) {
        this.selectedLayers.push(layer);
      }
    } else {
      this.selectedLayers = this.selectedLayers.filter(l => l !== layer);
    }
  }

  onReducerToggle(reducer: string, isChecked: boolean): void {
    if (isChecked) {
      if (!this.selectedReducers.includes(reducer)) {
        this.selectedReducers.push(reducer);
      }
    } else {
      this.selectedReducers = this.selectedReducers.filter(r => r !== reducer);
    }
  }

async onSubmit(): Promise<void> {
  const missingFields: string[] = [];

  if (!this.drawnBounds) {
    missingFields.push('polygon');
  }

  if (!this.startDate || !this.endDate) {
    missingFields.push('date range');
  }

  if (this.selectedLayers.length === 0) {
    missingFields.push('layer selection');
  }

  if (this.selectedReducers.length === 0) {
    missingFields.push('statistics selection');
  }

  if (missingFields.length > 0) {
    const message = 'Please complete the following before submitting:\n\n' +
      missingFields.map(field => `• ${field}`).join('\n');

    Swal.fire({
      icon: 'warning',
      title: 'Missing Fields',
      text: message,
      customClass: {
        popup: 'swal2-border-radius' // optional styling
      }
    });

    return;
  }

  const southWest = this.drawnBounds!.getSouthWest();
  const northEast = this.drawnBounds!.getNorthEast();

  const geom = {
    type: 'Polygon',
    coordinates: [[
      [southWest.lng, southWest.lat],
      [northEast.lng, southWest.lat],
      [northEast.lng, northEast.lat],
      [southWest.lng, northEast.lat],
      [southWest.lng, southWest.lat]
    ]]
  };

  this.loading = true;
  this.lineChartData = { labels: [], datasets: [] };

  try {
    const labelsSet = new Set<string>();
    const datasets: ChartDataset<'line'>[] = [];

    for (const reducer of this.selectedReducers) {
      const baseUrl = `http://192.168.1.17:5001/${reducer}`;
      let params = new HttpParams()
        .set('geom', JSON.stringify(geom))
        .set('start_date', this.startDate!.toISOString().split('T')[0])
        .set('end_date', this.endDate!.toISOString().split('T')[0]);

      for (const layer of this.selectedLayers) {
        params = params.append('layers', layer);
      }

      // Sequential request - wait for this one to complete before continuing
      const response = await this.http.get<{ [layer: string]: { [date: string]: number } }>(baseUrl, { params }).toPromise();

      Object.entries(response ?? {}).forEach(([layer, data]) => {
        const sortedDates = Object.keys(data ?? {}).sort();
        sortedDates.forEach(date => labelsSet.add(date));
        const values = sortedDates.map(date => data?.[date] ?? 0);

        datasets.push({
          type: 'line',
          label: `${layer} (${reducer})`,
          data: values,
          fill: false,
          borderColor: this.getColorForLayerAndReducer(layer, reducer),
          backgroundColor: 'white',
          pointBorderColor: 'white',
          pointBackgroundColor: 'white',
          tension: 0.1,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2
        });
      });
    }

    const sortedLabels = Array.from(labelsSet).sort();

    this.lineChartData = {
      labels: sortedLabels,
      datasets
    };
  } catch (error) {
    console.error('❌ Error fetching data:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'There was an error fetching data. Please try again later.'
    });
  } finally {
    this.loading = false;
  }
}


  private getColorForLayerAndReducer(layer: string, reducer: string): string {
    // You can customize colors here, or use a color library
    const baseColors: { [key: string]: string } = {
      NDVI: 'white',
      NDWI: 'green'
    };

    const reducerColors: { [key: string]: string } = {
      mean: '#2196F3',  // blue
      min: '#4CAF50',   // green
      max: '#F44336',   // red
      std: '#FF9800'     // orange
    };

    const baseColor = baseColors[layer] ?? 'gray';
    const reducerColor = reducerColors[reducer] ?? 'black';

    // For better visual separation, return reducer color here
    return reducerColor;
  }
}
