import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoardDetail } from './board-detail';

describe('BoardDetail', () => {
  let component: BoardDetail;
  let fixture: ComponentFixture<BoardDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoardDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BoardDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
