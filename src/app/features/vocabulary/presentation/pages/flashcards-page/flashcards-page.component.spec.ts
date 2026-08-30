import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {jest} from '@jest/globals';
import {ReviewFacade} from '../../../application/facades/review.facade';
import {FlashcardsPageComponent} from './flashcards-page.component';

describe('FlashcardsPageComponent route inputs', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('starts once after query inputs are bound', () => {
    const facade = {start: jest.fn()};
    TestBed.configureTestingModule({
      imports: [FlashcardsPageComponent],
      providers: [provideRouter([]), {provide: ReviewFacade, useValue: facade}],
    });
    const fixture = TestBed.createComponent(FlashcardsPageComponent);
    fixture.componentRef.setInput('quick', '1');
    fixture.componentRef.setInput('difficult', '1');

    fixture.componentInstance.ngOnInit();

    expect(facade.start).toHaveBeenCalledTimes(1);
    expect(facade.start).toHaveBeenCalledWith('FLASHCARDS', {limit: 10, difficultOnly: true});
  });
});
