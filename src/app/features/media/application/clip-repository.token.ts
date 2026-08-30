import {InjectionToken} from '@angular/core';
import {ClipRepository} from '../domain/clip.entity';

export const CLIP_REPOSITORY = new InjectionToken<ClipRepository>('ClipRepository');
