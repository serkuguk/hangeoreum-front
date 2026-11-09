import {ClipSubtitle} from '@shared/models/clip-subtitle';

// значения — ключи i18n, чтобы шаблон переводил их без маппинга
export enum SrtError {
  BadTime = 'admin.media.errors.subtitlesBadTime',
  EndBeforeStart = 'admin.media.errors.subtitlesEndBeforeStart',
  EmptyText = 'admin.media.errors.subtitlesEmptyText',
}

export interface SrtParseResult {
  subtitles: ClipSubtitle[];
  errors: {cue: number; error: SrtError}[];
}

const ARROW = '-->';
// 00:00:01,500 (SRT) | 00:00:01.500 | 00:01.500 (VTT без часов)
const TIME = /^(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})$/;
const VTT_META = /^(WEBVTT|NOTE|STYLE|REGION)\b/;
// <i>, <c.color>, <00:00:01.000> и {\an8}
const TAGS = /<[^>]*>|\{\\[^}]*\}/g;

function toMs(value: string): number | null {
  const match = TIME.exec(value.trim());
  if (!match) return null;
  const [, hours = '0', minutes, seconds, millis] = match;
  return ((Number(hours) * 60 + Number(minutes)) * 60 + Number(seconds)) * 1000 + Number(millis.padEnd(3, '0'));
}

/** Разбирает текст .srt/.vtt одной дорожки. Пустой текст — пустая дорожка без ошибок. */
export function parseSrt(text: string, lang: string): SrtParseResult {
  const result: SrtParseResult = {subtitles: [], errors: []};
  const blocks = text.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n/);
  let cue = 0;
  for (const block of blocks) {
    // trim() срезает и BOM, который часто стоит в начале .srt из Windows
    const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
    if (!lines.length || VTT_META.test(lines[0])) continue;
    cue++;
    // строка времени — первая или вторая (после номера фразы/идентификатора VTT)
    const timeIndex = lines.findIndex(line => line.includes(ARROW));
    if (timeIndex < 0 || timeIndex > 1) {
      result.errors.push({cue, error: SrtError.BadTime});
      continue;
    }
    const [startRaw, endRaw] = lines[timeIndex].split(ARROW);
    const startMs = toMs(startRaw);
    const endMs = toMs(endRaw.trim().split(/\s+/)[0]); // в VTT после времени бывают настройки (align:start)
    const cueText = lines.slice(timeIndex + 1).map(line => line.replace(TAGS, '').trim()).filter(Boolean).join('\n');
    if (startMs === null || endMs === null) result.errors.push({cue, error: SrtError.BadTime});
    else if (endMs <= startMs) result.errors.push({cue, error: SrtError.EndBeforeStart});
    else if (!cueText) result.errors.push({cue, error: SrtError.EmptyText});
    else result.subtitles.push({lang, position: result.subtitles.length, text: cueText, startMs, endMs});
  }
  return result;
}

function formatMs(ms: number): string {
  const pad = (value: number, width = 2) => String(value).padStart(width, '0');
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor(ms / 60_000) % 60;
  const seconds = Math.floor(ms / 1000) % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(ms % 1000, 3)}`;
}

/** Обратно в SRT — чтобы показать уже сохранённые субтитры в редакторе. */
export function toSrt(subtitles: ClipSubtitle[]): string {
  return [...subtitles]
    .sort((a, b) => a.startMs - b.startMs || a.position - b.position)
    .map((sub, index) => `${index + 1}\n${formatMs(sub.startMs)} ${ARROW} ${formatMs(sub.endMs)}\n${sub.text}`)
    .join('\n\n');
}
