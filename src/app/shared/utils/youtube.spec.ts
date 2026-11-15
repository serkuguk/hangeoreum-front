import {youtubeId, youtubeThumbnail} from './youtube';

describe('youtube', () => {
  it('parses the same link formats as the backend', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=10',
      'http://m.youtube.com/watch?v=dQw4w9WgXcQ',
      'youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ?si=abc',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      '  https://YOUTU.BE/dQw4w9WgXcQ  ',
    ]) {
      expect(youtubeId(url)).toBe('dQw4w9WgXcQ');
    }
  });

  it('rejects everything else', () => {
    for (const url of [
      null, '', 'garbage', '/media/clips/abc.mp4',
      'https://youtube.com.evil.ru/watch?v=dQw4w9WgXcQ',
      'https://evil.ru/youtu.be/dQw4w9WgXcQ', 'https://youtu.be/short',
      'https://www.youtube.com/channel/dQw4w9WgXcQ', 'javascript:alert(1)', 'ftp://youtu.be/dQw4w9WgXcQ',
    ]) {
      expect(youtubeId(url)).toBeNull();
    }
  });

  it('builds the thumbnail url', () => {
    expect(youtubeThumbnail('dQw4w9WgXcQ')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
});
