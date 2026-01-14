import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mural } from './mural';

describe('Mural', () => {
  let component: Mural;
  let fixture: ComponentFixture<Mural>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Mural]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Mural);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
