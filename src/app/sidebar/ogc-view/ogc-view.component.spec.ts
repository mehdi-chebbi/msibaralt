import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OgcViewComponent } from './ogc-view.component';

describe('OgcViewComponent', () => {
  let component: OgcViewComponent;
  let fixture: ComponentFixture<OgcViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OgcViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OgcViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
