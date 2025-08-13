import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-draw';
import { Subscription } from 'rxjs';
import { BaseMapService } from '../../services/base-map.service';
import { OgcService, OgcParams } from '../../services/ogc.service';
import { GeometryService } from '../../services/geometry.service'; // ✅ NEW IMPORT
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
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
  private opacitySubscription!: Subscription; // ✅ NEW
  private wmsUrlSubscription!: Subscription;  // ✅ NEW
  private imageOverlay: L.ImageOverlay | null = null;
  private lastDrawnBounds: L.LatLngBounds | null = null;

  private defaultCenter: L.LatLngExpression = [31.76299759769429, 9.7998046875];

  // Enhancements: track base map name and status text
  private currentBaseName: string = 'OpenStreetMap';
  statusLat: number | null = null;
  statusLng: number | null = null;
  zoomLevel: number = 0;
  private locateMarker: L.Marker | null = null;

  private latestWmsUrl: string | null = null; // ✅ NEW

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

    // Initial state from URL, if any
    const qs = new URLSearchParams(window.location.search);
    const urlLayer = qs.get('layer');
    const urlLat = parseFloat(qs.get('lat') || '');
    const urlLng = parseFloat(qs.get('lng') || '');
    const urlZ = parseInt(qs.get('z') || '', 10);

    // Add base layer (URL layer if valid, else default OSM)
    if (urlLayer && this.baseMaps[urlLayer]) {
      this.currentBaseLayer = this.baseMaps[urlLayer];
      this.currentBaseName = urlLayer;
    } else {
      this.currentBaseLayer = this.baseMaps['OpenStreetMap'];
      this.currentBaseName = 'OpenStreetMap';
    }
    this.currentBaseLayer.addTo(this.map);

    // Apply URL center/zoom if valid
    if (!Number.isNaN(urlLat) && !Number.isNaN(urlLng) && !Number.isNaN(urlZ)) {
      this.map.setView([urlLat, urlLng], urlZ);
    }

    // Switch base map
    this.baseMapSubscription = this.baseMapService.baseMap$.subscribe((mapName) => {
      if (this.baseMaps[mapName]) {
        this.map.removeLayer(this.currentBaseLayer);
        this.currentBaseLayer = this.baseMaps[mapName];
        this.currentBaseName = mapName;
        this.currentBaseLayer.addTo(this.map);
        this.updateUrlFromMap();
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

    // Scale control
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(this.map);

    // Custom locate control (top-right)
    const self = this;
    const LocateControl = (L.Control as any).extend({
      options: { position: 'topright' },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const link = L.DomUtil.create('a', '', container);
        link.href = '#';
        link.title = 'Locate me';
        link.innerHTML = '⌖';
        L.DomEvent.on(link, 'click', L.DomEvent.stop)
          .on(link, 'click', () => self.locateMe());
        return container;
      }
    });
    this.map.addControl(new LocateControl());

    // Mouse position + zoom status
    this.zoomLevel = this.map.getZoom();
    this.map.on('mousemove', (e: L.LeafletMouseEvent) => {
      this.statusLat = e.latlng.lat;
      this.statusLng = e.latlng.lng;
    });
    this.map.on('zoomend', () => {
      this.zoomLevel = this.map.getZoom();
      this.updateUrlFromMap();
    });
    this.map.on('moveend', () => {
      this.updateUrlFromMap();
    });

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

    // Listen for WMS URL updates (for legend)
    this.wmsUrlSubscription = this.ogcService.wmsUrl$.subscribe(url => {
      this.latestWmsUrl = url;
    });

    // Listen for opacity updates
    this.opacitySubscription = this.ogcService.opacity$.subscribe(opacity => {
      if (this.imageOverlay) {
        this.imageOverlay.setOpacity(opacity);
      }
    });
  }

  get statusText(): string {
    if (this.statusLat === null || this.statusLng === null) return '';
    return `${this.statusLat.toFixed(5)}, ${this.statusLng.toFixed(5)} | z ${this.zoomLevel}`;
  }

  get legendUrl(): string | null {
    if (!this.latestWmsUrl) return null;
    const url = new URL(this.latestWmsUrl);
    const layer = url.searchParams.get('LAYERS');
    if (!layer) return null;
    const base = this.latestWmsUrl.split('?')[0];
    const legend = `${base}?SERVICE=WMS&REQUEST=GetLegendGraphic&VERSION=1.3.0&FORMAT=image/png&LAYER=${encodeURIComponent(layer)}`;
    return legend;
  }

  private updateUrlFromMap(): void {
    const center = this.map.getCenter();
    const z = this.map.getZoom();
    const params = new URLSearchParams(window.location.search);
    params.set('lat', center.lat.toFixed(5));
    params.set('lng', center.lng.toFixed(5));
    params.set('z', String(z));
    params.set('layer', this.currentBaseName);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    history.replaceState({}, '', newUrl);
  }

  private locateMe(): void {
    if (!navigator.geolocation) {
      console.warn('Geolocation not available');
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const latlng: L.LatLngExpression = [pos.coords.latitude, pos.coords.longitude];
      if (this.locateMarker) {
        this.map.removeLayer(this.locateMarker);
      }
      this.locateMarker = L.marker(latlng);
      this.locateMarker.addTo(this.map);
      this.map.setView(latlng, Math.max(this.map.getZoom(), 10));
    }, (err) => {
      console.warn('Geolocation error', err);
    }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
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
    this.opacitySubscription?.unsubscribe();
    this.wmsUrlSubscription?.unsubscribe();
  }
}
