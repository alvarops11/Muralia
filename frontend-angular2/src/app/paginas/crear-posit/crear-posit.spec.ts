import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearPosit } from './crear-posit';

describe('CrearPosit', () => {
  let component: CrearPosit;
  let fixture: ComponentFixture<CrearPosit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearPosit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearPosit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
