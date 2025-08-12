import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BaseMapService {
  private baseMapSource = new BehaviorSubject<string>('Satellite');
  baseMap$ = this.baseMapSource.asObservable();

  changeBaseMap(mapName: string): void {
    this.baseMapSource.next(mapName);
  }
}
