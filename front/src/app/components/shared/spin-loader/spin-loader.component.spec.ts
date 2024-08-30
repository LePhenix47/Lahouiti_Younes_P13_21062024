import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpinLoaderComponent } from './spin-loader.component';

describe('SpinLoaderComponent', () => {
  let component: SpinLoaderComponent;
  let fixture: ComponentFixture<SpinLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpinLoaderComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SpinLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
