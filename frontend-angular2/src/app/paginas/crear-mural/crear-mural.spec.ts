import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearMural } from './crear-mural';

describe('CrearMural', () => {
  let component: CrearMural;
  let fixture: ComponentFixture<CrearMural>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearMural]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearMural);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
