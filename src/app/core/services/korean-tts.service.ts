import {Injectable} from '@angular/core';

/**
 * Озвучка корейского: audio_url с бэка, иначе fallback SpeechSynthesis (ko-KR).
 * Используется алфавитом, карточками, уроками, словарём.
 */
@Injectable({providedIn: 'root'})
export class KoreanTtsService {
  private audio: HTMLAudioElement | null = null;
  private rate = 1.0;

  setRate(rate: number): void {
    this.rate = rate;
  }

  speak(text: string, audioUrl?: string | null): void {
    this.stop();
    if (audioUrl) {
      this.audio = new Audio(audioUrl);
      this.audio.playbackRate = this.rate;
      // При недоступном файле озвучиваем синтезом
      this.audio.play().catch(() => this.synthesize(text));
      return;
    }
    this.synthesize(text);
  }

  stop(): void {
    this.audio?.pause();
    this.audio = null;
    window.speechSynthesis?.cancel();
  }

  private synthesize(text: string): void {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ko-KR';
    utter.rate = this.rate;
    const koVoice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('ko'));
    if (koVoice) utter.voice = koVoice;
    window.speechSynthesis.speak(utter);
  }
}
