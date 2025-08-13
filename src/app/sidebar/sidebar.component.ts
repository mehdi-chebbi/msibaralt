import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';  // <-- import this
import { OgcViewComponent } from '../sidebar/ogc-view/ogc-view.component';
import { BaseMapComponent } from "./base-map/base-map.component";
import { StatistiquesComponent } from "./statistiques/statistiques.component";

interface Tab {
  id: string;
  label: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, OgcViewComponent, BaseMapComponent, StatistiquesComponent],   // <-- add here
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  open = true; // will be ignored in fixed mode
  activeTab = 'baseMap';
  fade = true;

  tabs: Tab[] = [
    { id: 'baseMap', label: 'Base Map' },
    { id: 'ogcView', label: 'Explore Africa' },
    { id: 'statistiques', label: 'statistiques' },
   // { id: 'download', label: 'Download Images' },
  ];
get activeTabLabel(): string {
  const tab = this.tabs.find(t => t.id === this.activeTab);
  return tab ? tab.label : '';
}
setActiveTab(tabId: string) {
  this.activeTab = tabId;
}



  toggleSidebar() {
    this.open = !this.open;
  }
}
