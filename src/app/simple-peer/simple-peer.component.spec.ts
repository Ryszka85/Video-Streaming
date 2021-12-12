import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimplePeerComponent } from './simple-peer.component';

describe('SimplePeerComponent', () => {
  let component: SimplePeerComponent;
  let fixture: ComponentFixture<SimplePeerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SimplePeerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SimplePeerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
