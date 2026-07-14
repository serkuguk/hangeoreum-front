import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToolTipeComponent } from './tool-tipe.component';

describe('ToolTipeComponent', () => {
  let component: ToolTipeComponent;
  let fixture: ComponentFixture<ToolTipeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolTipeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToolTipeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
