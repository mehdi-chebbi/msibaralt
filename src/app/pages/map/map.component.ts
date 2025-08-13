import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-draw';
import { Subscription } from 'rxjs';
import { BaseMapService } from '../../services/base-map.service';
import { OgcService, OgcParams } from '../../services/ogc.service';
import { GeometryService } from '../../services/geometry.service'; // ✅ NEW IMPORT
import { SidebarComponent } from '../../sidebar/sidebar.component';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [SidebarComponent],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private map!: L.Map;
  private drawnItems!: L.FeatureGroup;
  private currentBaseLayer!: L.TileLayer;
  private baseMaps!: { [key: string]: L.TileLayer };
  private baseMapSubscription!: Subscription;
  private ogcParamsSubscription!: Subscription;
  private imageOverlay: L.ImageOverlay | null = null;
  private lastDrawnBounds: L.LatLngBounds | null = null;

  private defaultCenter: L.LatLngExpression = [31.76299759769429, 9.7998046875];

  constructor(
    private baseMapService: BaseMapService,
    private ogcService: OgcService,
    private geometryService: GeometryService // ✅ INJECT SERVICE
  ) {}

  ngAfterViewInit(): void {
    // Initialize map
    this.map = L.map('map', {
      center: this.defaultCenter,
      zoom: 5,
      zoomControl: false,
    });

    // Define base maps
    this.baseMaps = {
      'NDVI': L.tileLayer.wms('https://sh.dataspace.copernicus.eu/ogc/wms/2e44e6fc-1f1c-4258-bd09-8a15c317f604', {
        layers: 'NDVI-L2A',
        format: 'image/png',
        transparent: true,
        attribution: 'Copernicus Data Space Ecosystem',
        version: '1.3.0',
        crs: L.CRS.EPSG3857,
      }),
      'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }),
      'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri'
      }),
      'Dark': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        attribution: '&copy; CARTO',
      }),
      'Light': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; CARTO',
      }),
      'Topographic': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenTopoMap contributors',
      }),
    };

    // Add default base layer
    this.currentBaseLayer = this.baseMaps['OpenStreetMap'];
    this.currentBaseLayer.addTo(this.map);

    // Switch base map
    this.baseMapSubscription = this.baseMapService.baseMap$.subscribe((mapName) => {
      if (this.baseMaps[mapName]) {
        this.map.removeLayer(this.currentBaseLayer);
        this.currentBaseLayer = this.baseMaps[mapName];
        this.currentBaseLayer.addTo(this.map);
      }
    });

    // Drawing
    this.drawnItems = new L.FeatureGroup();
    this.map.addLayer(this.drawnItems);

    L.control.zoom({ position: 'topright' }).addTo(this.map);

    const drawControl = new L.Control.Draw({
      position: 'topright',
      edit: { featureGroup: this.drawnItems },
      draw: {
        polygon: {},
        marker: false,
        polyline: false,
        circle: false,
        rectangle: false,
        circlemarker: false,
      },
    });
    this.map.addControl(drawControl);

    this.map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      this.drawnItems.clearLayers(); // Only one polygon at a time
      this.drawnItems.addLayer(layer);

      if (layer instanceof L.Polygon) {
        this.lastDrawnBounds = layer.getBounds();
        this.map.fitBounds(this.lastDrawnBounds);
        console.log('Polygon drawn, bounds:', this.lastDrawnBounds);

        // ✅ Send bounds to GeometryService
        this.geometryService.setBounds(this.lastDrawnBounds);
      }
    });

    // Listen for OGC params and update overlay
    this.ogcParamsSubscription = this.ogcService.params$.subscribe((params: OgcParams) => {
      this.updateMapWithParams(params);
    });
  }

  updateMapWithParams(params: OgcParams) {
    if (!params.startDate || !params.selectedLayer || params.cloudPercentage === null) {
      console.warn('Missing required parameters, skipping image overlay.');
      return;
    }

    if (!this.lastDrawnBounds) {
      console.warn('No polygon drawn. Please draw one before requesting the map.');
      return;
    }

    const formattedTime = new Date(params.startDate).toISOString().split('.')[0] + 'Z';

    const sw = this.lastDrawnBounds.getSouthWest();
    const ne = this.lastDrawnBounds.getNorthEast();

    const bbox = `${sw.lat},${sw.lng},${ne.lat},${ne.lng}`;

    const imageUrl = `https://sh.dataspace.copernicus.eu/ogc/wms/2e44e6fc-1f1c-4258-bd09-8a15c317f604?` +
      `SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${params.selectedLayer}` +
      `&BBOX=${bbox}&CRS=EPSG:4326&WIDTH=2500&HEIGHT=2500&FORMAT=image/png` +
      `&TIME=${formattedTime}&MAXCC=${params.cloudPercentage}`;

    if (this.imageOverlay) {
      this.map.removeLayer(this.imageOverlay);
    }

    this.imageOverlay = L.imageOverlay(imageUrl, this.lastDrawnBounds, {
      opacity: 1
    });
    this.imageOverlay.addTo(this.map);

    console.log('WMS Image URL:', imageUrl);
    console.log('Using BBOX:', bbox);
this.ogcService.setWmsUrl(imageUrl); // ✅ Store WMS URL

    this.map.fitBounds(this.lastDrawnBounds);
  }

  ngOnDestroy(): void {
    this.baseMapSubscription?.unsubscribe();
    this.ogcParamsSubscription?.unsubscribe();
  }
}
