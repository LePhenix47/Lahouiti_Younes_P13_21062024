import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollapsibleHeightComponent } from './collapsible-height.component';

describe('CollapsibleHeightComponent', () => {
  let component: CollapsibleHeightComponent;
  let fixture: ComponentFixture<CollapsibleHeightComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollapsibleHeightComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CollapsibleHeightComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
