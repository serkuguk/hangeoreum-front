import {SrtError, parseSrt, toSrt} from './subtitle-srt';

describe('parseSrt / toSrt', () => {
  it('parses SRT with CRLF, BOM, tags and multi-line cues', () => {
    const srt = '﻿1\r\n00:00:01,500 --> 00:00:03,000\r\n<i>안녕하세요</i>\r\n\r\n'
      + '2\r\n01:02:03,004 --> 01:02:05,000\r\n첫 줄\r\n{\\an8}둘째 줄\r\n';
    expect(parseSrt(srt, 'ko')).toEqual({
      errors: [],
      subtitles: [
        {lang: 'ko', position: 0, text: '안녕하세요', startMs: 1500, endMs: 3000},
        {lang: 'ko', position: 1, text: '첫 줄\n둘째 줄', startMs: 3_723_004, endMs: 3_725_000},
      ],
    });
  });

  it('parses VTT with header, notes, cue ids, short times and cue settings', () => {
    const vtt = 'WEBVTT\nKind: captions\n\nNOTE comment\n\nintro\n00:01.5 --> 00:02.000 align:start\nПривет\n\n00:02.000 --> 00:04.000\nКак дела?';
    expect(parseSrt(vtt, 'ru').subtitles).toEqual([
      {lang: 'ru', position: 0, text: 'Привет', startMs: 1500, endMs: 2000},
      {lang: 'ru', position: 1, text: 'Как дела?', startMs: 2000, endMs: 4000},
    ]);
  });

  it('reports cue numbers for broken cues and treats empty text as an empty track', () => {
    const broken = '1\n00:00:01 --> 00:00:02,000\nA\n\n2\n00:00:03,000 --> 00:00:02,000\nB\n\n3\n00:00:04,000 --> 00:00:05,000\n<i></i>\n\njust text';
    expect(parseSrt(broken, 'ko').errors).toEqual([
      {cue: 1, error: SrtError.BadTime},
      {cue: 2, error: SrtError.EndBeforeStart},
      {cue: 3, error: SrtError.EmptyText},
      {cue: 4, error: SrtError.BadTime},
    ]);
    expect(parseSrt('  \n\n ', 'ko')).toEqual({subtitles: [], errors: []});
  });

  it('round-trips saved subtitles, ordering by time', () => {
    const subs = [
      {lang: 'ko', position: 1, text: '둘', startMs: 2000, endMs: 3000},
      {lang: 'ko', position: 0, text: '하나\n줄', startMs: 0, endMs: 1999},
    ];
    expect(toSrt(subs)).toBe('1\n00:00:00,000 --> 00:00:01,999\n하나\n줄\n\n2\n00:00:02,000 --> 00:00:03,000\n둘');
    expect(parseSrt(toSrt(subs), 'ko').subtitles).toEqual([subs[1], subs[0]]);
  });
});
