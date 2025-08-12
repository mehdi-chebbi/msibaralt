import { Routes } from '@angular/router';
import { MapComponent } from './pages/map/map.component';

export const routes: Routes = [
  // Redirect the empty path to /map, or remove this if you want a separate home page
  { path: '', redirectTo: 'map', pathMatch: 'full' },

  // Your full‑screen map page
  { path: 'map', component: MapComponent },

  // Wildcard route (optional): redirect any unknown URL back to /map
  { path: '**', redirectTo: 'map' }
];
