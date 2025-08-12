import { Component } from '@angular/core';
import { BaseMapService } from '../../services/base-map.service';
import { CommonModule } from '@angular/common';

interface BaseMapOption {
  key: string;
  label: string;
  imgSrc: string;
}

@Component({
  selector: 'app-base-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './base-map.component.html',
  styleUrls: ['./base-map.component.css'],
})
export class BaseMapComponent {
  baseMaps: BaseMapOption[] = [
    {
      key: 'satellite',
      label: 'Satellite',
      imgSrc: 'https://tiles.maps.eox.at/wms?LAYERS=s2cloudless-2020&FORMAT=image/jpeg&STYLES=&SRS=EPSG:4326&TRANSPARENT=FALSE&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&BBOX=-20,0,40,50&WIDTH=352&HEIGHT=200'
    },{
      key: 'NDVI',
      label: 'NDVI',
      imgSrc: 'https://www.researchgate.net/publication/284190560/figure/fig5/AS:668237402501140@1536331620368/Normalized-Difference-Vegetation-Index-NDVI-data-used-in-FEWS-NET-activities-with-a.png'
    },
    {
      key: 'street',
      label: 'OpenStreetMap',
      imgSrc: 'https://visioterra.org/mapproxy/service?LAYERS=OSM_Official&FORMAT=image/png&STYLES=&SRS=EPSG:4326&TRANSPARENT=FALSE&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&BBOX=-20,0,40,50&WIDTH=352&HEIGHT=200'
    },
    {
      key: 'dark',
      label: 'Dark',
      imgSrc: 'https://visioterra.org/mapproxy/service?LAYERS=Dark_VisioTerra&FORMAT=image/png&STYLES=&SRS=EPSG:4326&TRANSPARENT=FALSE&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&BBOX=-20,0,40,50&WIDTH=352&HEIGHT=200'
    },
    {
      key: 'light',
      label: 'Light',
      imgSrc: 'https://visioterra.org/mapproxy/service?LAYERS=OSM_Humanitarian_Official&FORMAT=image/png&STYLES=&SRS=EPSG:4326&TRANSPARENT=FALSE&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&BBOX=-20,0,40,50&WIDTH=352&HEIGHT=200'
    },
    {
      key: 'topo',
      label: 'Topographic (OpenTopoMap)',
      imgSrc: 'https://cdn6.aptoide.com/imgs/2/2/5/2251e56c36f11188c8ad4835f42e3d91_fgraphic.png'
    },
  ];

  constructor(private baseMapService: BaseMapService) {}

  changeBaseMap(key: string): void {
    // Map your keys to the ones used in your MapComponent baseMaps if needed
    let mapName = key;
    // Example remapping for your MapComponent keys:
    if (key === 'street') mapName = 'OpenStreetMap';
    else if (key === 'topo') mapName = 'Topographic';
    else if (key === 'satellite') mapName = 'Satellite';
    else if (key === 'dark') mapName = 'Dark';
    else if (key === 'light') mapName = 'Light';
    else if (key === 'NDVI') mapName = 'NDVI';

    this.baseMapService.changeBaseMap(mapName);
  }
}
