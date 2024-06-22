import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessSupportComponent } from './access-support.component';

describe('AccessSupportComponent', () => {
  let component: AccessSupportComponent;
  let fixture: ComponentFixture<AccessSupportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessSupportComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AccessSupportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
