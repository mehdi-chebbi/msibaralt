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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

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
    MatProgressSpinnerModule,
    MatSnackBarModule
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
    maintainAspectRatio: false,
    animation: false,
    spanGaps: true,
    elements: { point: { radius: 0 } },
    interaction: { mode: 'nearest', intersect: false },
    plugins: {
      legend: {
        labels: { color: '#111827', usePointStyle: true }
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#111827',
        titleColor: '#f9fafb',
        bodyColor: '#f9fafb'
      },
      decimation: {
        enabled: true,
        algorithm: 'lttb',
        samples: 500
      }
    },
    scales: {
      x: {
        ticks: { color: '#374151', autoSkip: true, maxRotation: 0 },
        grid: { color: 'rgba(17,24,39,0.08)' }
      },
      y: {
        beginAtZero: false,
        ticks: { color: '#374151' },
        grid: { color: 'rgba(17,24,39,0.08)' }
      }
    }
  };

  constructor(
    private geometryService: GeometryService,
    private http: HttpClient,
    private snackBar: MatSnackBar
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

    if (!this.drawnBounds) missingFields.push('polygon');
    if (!this.startDate || !this.endDate) missingFields.push('date range');
    if (this.selectedLayers.length === 0) missingFields.push('layer selection');
    if (this.selectedReducers.length === 0) missingFields.push('statistics selection');

    if (missingFields.length > 0) {
      this.snackBar.open(`Please complete: ${missingFields.join(', ')}`, 'Close', { duration: 3000 });
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

        const response = await this.http.get<{ [layer: string]: { [date: string]: number } }>(baseUrl, { params }).toPromise();

        Object.entries(response ?? {}).forEach(([layer, data]) => {
          const sortedDates = Object.keys(data ?? {}).sort();
          sortedDates.forEach(date => labelsSet.add(date));
          const values = sortedDates.map(date => data?.[date] ?? 0);

          const color = this.getColorForLayerAndReducer(layer, reducer);
          datasets.push({
            type: 'line',
            label: `${layer} (${reducer})`,
            data: values,
            fill: false,
            borderColor: color,
            backgroundColor: color,
            tension: 0.2,
            pointRadius: 0,
            borderWidth: 2
          });
        });
      }

      const sortedLabels = Array.from(labelsSet).sort();

      this.lineChartData = {
        labels: sortedLabels,
        datasets
      };

      this.snackBar.open('Statistics loaded', '', { duration: 1500 });
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      this.snackBar.open('Error fetching data. Please try again later.', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  private getColorForLayerAndReducer(layer: string, reducer: string): string {
    const reducerColors: { [key: string]: string } = {
      mean: '#2563eb',
      min: '#16a34a',
      max: '#ef4444',
      std: '#f59e0b'
    };
    return reducerColors[reducer] ?? '#111827';
  }
}
