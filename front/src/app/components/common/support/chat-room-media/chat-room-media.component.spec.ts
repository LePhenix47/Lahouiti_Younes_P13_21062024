import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatRoomMediaComponent } from './chat-room-media.component';

describe('ChatRoomMediaComponent', () => {
  let component: ChatRoomMediaComponent;
  let fixture: ComponentFixture<ChatRoomMediaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatRoomMediaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChatRoomMediaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
