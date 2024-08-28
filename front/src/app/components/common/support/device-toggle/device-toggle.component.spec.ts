import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceToggleComponent } from './device-toggle.component';

describe('DeviceToggleComponent', () => {
  let component: DeviceToggleComponent;
  let fixture: ComponentFixture<DeviceToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviceToggleComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DeviceToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
