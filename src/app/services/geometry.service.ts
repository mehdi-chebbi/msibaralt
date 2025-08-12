import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as L from 'leaflet';

@Injectable({
  providedIn: 'root'
})
export class GeometryService {
  private boundsSource = new BehaviorSubject<L.LatLngBounds | null>(null);
  bounds$ = this.boundsSource.asObservable();

  setBounds(bounds: L.LatLngBounds) {
    this.boundsSource.next(bounds);
  }

  hasPolygon(): boolean {
    return this.boundsSource.getValue() !== null;
  }
}
