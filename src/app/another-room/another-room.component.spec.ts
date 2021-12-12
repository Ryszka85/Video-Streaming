import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnotherRoomComponent } from './another-room.component';

describe('AnotherRoomComponent', () => {
  let component: AnotherRoomComponent;
  let fixture: ComponentFixture<AnotherRoomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnotherRoomComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnotherRoomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
