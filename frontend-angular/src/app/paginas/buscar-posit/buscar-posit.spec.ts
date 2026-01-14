import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuscarPosit } from './buscar-posit';

describe('BuscarPosit', () => {
  let component: BuscarPosit;
  let fixture: ComponentFixture<BuscarPosit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuscarPosit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BuscarPosit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
