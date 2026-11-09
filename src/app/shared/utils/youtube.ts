// ponytail: свои типы на нужное подмножество IFrame API вместо @types/youtube; поставить пакет, если API понадобится шире
export interface YoutubePlayer {
  getCurrentTime(): number;
  pauseVideo(): void;
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}

export interface YoutubeApi {
  Player: new (element: HTMLElement, options: {
    videoId: string;
    host?: string;
    playerVars?: Record<string, number | string>;
    events?: {
      onStateChange?: (event: {data: number}) => void;
      onError?: (event: {data: number}) => void;
    };
  }) => YoutubePlayer;
  PlayerState: {ENDED: number; PLAYING: number};
}

declare global {
  interface Window {
    YT?: YoutubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);

/** ID видео из ссылки YouTube; разбирает так же, как YoutubeLink на бэкенде. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const raw = url.trim();
  let parsed: URL;
  try {
    parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(parsed.protocol)) return null;
  const host = parsed.hostname.toLowerCase();
  const parts = parsed.pathname.split('/');
  let id: string | null = null;
  if (host === 'youtu.be') id = parts.length === 2 ? parts[1] : null;
  else if (!HOSTS.has(host)) return null;
  else if (parsed.pathname === '/watch') id = parsed.searchParams.get('v');
  else if (parts.length === 3 && (parts[1] === 'shorts' || parts[1] === 'embed')) id = parts[2];
  return id && ID.test(id) ? id : null;
}

export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

// youtube.com, а не youtube-nocookie.com: на nocookie YouTube не видит вход пользователя
// и при «подозрительном» IP показывает «войдите, чтобы подтвердить, что вы не бот»
export const YOUTUBE_EMBED_HOST = 'https://www.youtube.com';

export function youtubeEmbedUrl(id: string): string {
  return `${YOUTUBE_EMBED_HOST}/embed/${id}`;
}

let api: Promise<YoutubeApi> | null = null;

/** Один раз подключает IFrame API; повторные вызовы получают тот же промис. */
export function loadYoutubeApi(): Promise<YoutubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  api ??= new Promise<YoutubeApi>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => {
      api = null; // следующая попытка загрузит скрипт заново
      reject(new Error('YouTube API unavailable'));
    };
    document.head.appendChild(script);
  });
  return api;
}
