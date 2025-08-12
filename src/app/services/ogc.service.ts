import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface OgcParams {
  startDate: Date | null;
  endDate: Date | null;
  cloudPercentage: number | null;
  selectedLayer: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class OgcService {
  private paramsSubject = new BehaviorSubject<OgcParams>({
    startDate: null,
    endDate: null,
    cloudPercentage: null,
    selectedLayer: null,
  });

  params$ = this.paramsSubject.asObservable();

  private wmsUrlSubject = new BehaviorSubject<string | null>(null); // ✅ NEW
  wmsUrl$ = this.wmsUrlSubject.asObservable();                      // ✅ NEW

  updateParams(params: OgcParams) {
    this.paramsSubject.next(params);
  }

  setWmsUrl(url: string) {         // ✅ NEW
    this.wmsUrlSubject.next(url);
  }

  getWmsUrl(): string | null {     // ✅ NEW
    return this.wmsUrlSubject.getValue();
  }
}
