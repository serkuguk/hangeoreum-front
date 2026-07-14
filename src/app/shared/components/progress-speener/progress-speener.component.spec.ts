import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProgressSpeenerComponent } from './progress-speener.component';

describe('ProgressSpeenerComponent', () => {
  let component: ProgressSpeenerComponent;
  let fixture: ComponentFixture<ProgressSpeenerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressSpeenerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProgressSpeenerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
