import {jest} from '@jest/globals';
import {TestBed} from '@angular/core/testing';
import {YoutubePlayerComponent} from './youtube-player.component';

describe('YoutubePlayerComponent', () => {
  let events: {onStateChange: (e: {data: number}) => void; onError: (e: {data: number}) => void};
  let options: {videoId: string; host: string};
  const fake = {getCurrentTime: jest.fn(() => 1.5), pauseVideo: jest.fn(), playVideo: jest.fn(), seekTo: jest.fn(), destroy: jest.fn()};

  beforeEach(() => {
    jest.useFakeTimers();
    window.YT = {
      PlayerState: {ENDED: 0, PLAYING: 1},
      Player: function (_el: HTMLElement, opts: never) {
        options = opts;
        events = (opts as {events: typeof events}).events;
        return fake;
      } as never,
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    delete window.YT;
  });

  it('polls time while playing, reports end and error, destroys the player', async () => {
    const fixture = TestBed.createComponent(YoutubePlayerComponent);
    fixture.componentRef.setInput('videoId', 'dQw4w9WgXcQ');
    const times: number[] = [];
    let ended = 0, failed = 0;
    fixture.componentInstance.timeChange.subscribe(t => times.push(t));
    fixture.componentInstance.ended.subscribe(() => ended++);
    fixture.componentInstance.failed.subscribe(() => failed++);
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();

    expect(options.videoId).toBe('dQw4w9WgXcQ');
    expect(options.host).toBe('https://www.youtube.com');
    events.onStateChange({data: 1});
    jest.advanceTimersByTime(500);
    expect(times).toEqual([1500, 1500, 1500]);

    events.onStateChange({data: 2}); // пауза — опрос останавливается
    jest.advanceTimersByTime(1000);
    expect(times.length).toBe(4);

    events.onStateChange({data: 0});
    events.onError({data: 150});
    expect([ended, failed]).toEqual([1, 1]);

    fixture.componentInstance.restart();
    expect(fake.seekTo).toHaveBeenCalledWith(0, true);
    fixture.destroy();
    expect(fake.destroy).toHaveBeenCalled();
  });
});
