import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseMapComponent } from '../sidebar/base-map/base-map.component';
import { OgcViewComponent } from '../sidebar/ogc-view/ogc-view.component';
import { StatistiquesComponent } from '../sidebar/statistiques/statistiques.component';

@Component({
  selector: 'app-overlay-controls',
  standalone: true,
  imports: [CommonModule, BaseMapComponent, OgcViewComponent, StatistiquesComponent],
  templateUrl: './overlay-controls.component.html',
  styleUrls: ['./overlay-controls.component.css']
})
export class OverlayControlsComponent {
  showLayersPanel = false;
  showOgcPanel = true;
  showStatsPanel = false;

  toggleLayers(): void {
    this.showLayersPanel = !this.showLayersPanel;
    if (this.showLayersPanel) {
      this.showOgcPanel = false;
      this.showStatsPanel = false;
    }
  }

  toggleOgc(): void {
    this.showOgcPanel = !this.showOgcPanel;
    if (this.showOgcPanel) {
      this.showLayersPanel = false;
      this.showStatsPanel = false;
    }
  }

  toggleStats(): void {
    this.showStatsPanel = !this.showStatsPanel;
    if (this.showStatsPanel) {
      this.showLayersPanel = false;
      this.showOgcPanel = false;
    }
  }

  closeAll(): void {
    this.showLayersPanel = false;
    this.showOgcPanel = false;
    this.showStatsPanel = false;
  }
}