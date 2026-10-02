import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {jest} from '@jest/globals';
import {of, Subject, throwError} from 'rxjs';
import {HgDialogComponent} from '@shared/components/controls';
import {AdminApi, AdminWord} from '../../infrastructure/admin.api';
import {AdminWordsPageComponent} from './admin-words-page.component';

const word: AdminWord = {
  id: 'word-1', hangul: '커피', romanization: 'keopi', translation: 'Кофе',
  imageUrl: '/uploads/old.png', audioUrl: null, partOfSpeech: null, topicId: null,
  exampleKo: null, exampleTranslation: null, grammarNote: null,
};
const image = new File(['image'], 'coffee.png', {type: 'image/png'});

describe('AdminWords image saving', () => {
  let fixture: ComponentFixture<AdminWordsPageComponent>;
  let component: AdminWordsPageComponent;
  let api: {
    words: jest.Mock; topics: jest.Mock; createWord: jest.Mock;
    updateWord: jest.Mock; uploadWordMedia: jest.Mock;
  };
  let createPreview: jest.Mock;
  let revokePreview: jest.Mock;
  const originalCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  const originalRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

  beforeEach(() => {
    api = {
      words: jest.fn().mockReturnValue(of({content: [word], totalElements: 1, page: 0})),
      topics: jest.fn().mockReturnValue(of([])),
      createWord: jest.fn().mockReturnValue(of(word)),
      updateWord: jest.fn().mockReturnValue(of(word)),
      uploadWordMedia: jest.fn().mockReturnValue(of({...word, imageUrl: '/uploads/new.png'})),
    };
    createPreview = jest.fn().mockReturnValue('blob:preview-1');
    revokePreview = jest.fn();
    Object.defineProperty(URL, 'createObjectURL', {configurable: true, value: createPreview});
    Object.defineProperty(URL, 'revokeObjectURL', {configurable: true, value: revokePreview});
    TestBed.configureTestingModule({
      imports: [AdminWordsPageComponent], providers: [{provide: AdminApi, useValue: api}],
    });
    fixture = TestBed.createComponent(AdminWordsPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
    jest.restoreAllMocks();
    if (originalCreate) Object.defineProperty(URL, 'createObjectURL', originalCreate);
    else Reflect.deleteProperty(URL, 'createObjectURL');
    if (originalRevoke) Object.defineProperty(URL, 'revokeObjectURL', originalRevoke);
    else Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  function openNewWord(): void {
    component.openCreate();
    component.draft.hangul = word.hangul;
    component.draft.romanization = word.romanization;
    component.draft.translation = word.translation;
  }

  it('creates a word without requiring an image', () => {
    openNewWord();
    component.save();
    expect(api.createWord).toHaveBeenCalledTimes(1);
    expect(api.uploadWordMedia).not.toHaveBeenCalled();
    expect(component.dialogOpen()).toBe(false);
    expect(component.saving()).toBe(false);
  });

  it.each(['create', 'edit'])('saves word fields before uploading a selected image for %s', mode => {
    if (mode === 'create') openNewWord();
    else component.openEdit(word);
    component.onImageSelected(image);
    component.save();

    const save = mode === 'create' ? api.createWord : api.updateWord;
    expect(save).toHaveBeenCalledTimes(1);
    expect(api.uploadWordMedia).toHaveBeenCalledWith(word.id, image, 'image');
    expect(save.mock.invocationCallOrder[0]).toBeLessThan(api.uploadWordMedia.mock.invocationCallOrder[0]);
    expect(component.dialogOpen()).toBe(false);
    expect(component.selectedImage()).toBeNull();
    expect(component.imagePreviewUrl()).toBeNull();
    expect(revokePreview).toHaveBeenCalledWith('blob:preview-1');
  });

  it('updates a word without replacing its existing image when no file was selected', () => {
    component.openEdit(word);
    component.draft.translation = 'Обновлённый перевод';
    component.save();
    expect(api.updateWord).toHaveBeenCalledWith(word.id, expect.objectContaining({translation: 'Обновлённый перевод'}));
    expect(api.createWord).not.toHaveBeenCalled();
    expect(api.uploadWordMedia).not.toHaveBeenCalled();
  });

  it('retains draft and chosen image after a word-save failure and does not attempt upload', () => {
    api.createWord.mockReturnValue(throwError(() => new Error('save failed')));
    openNewWord();
    component.onImageSelected(image);
    component.save();

    expect(component.dialogOpen()).toBe(true);
    expect(component.editing()).toBeNull();
    expect(component.draft.hangul).toBe('커피');
    expect(component.selectedImage()).toBe(image);
    expect(component.imagePreviewUrl()).toBe('blob:preview-1');
    expect(component.saveError()).toContain('сохранить');
    expect(component.saving()).toBe(false);
    expect(api.uploadWordMedia).not.toHaveBeenCalled();
    expect(revokePreview).not.toHaveBeenCalled();
  });

  it('retains the saved id, file and preview after upload failure and retries through update', () => {
    api.uploadWordMedia.mockReturnValueOnce(throwError(() => new Error('upload failed')));
    const initialLoads = api.words.mock.calls.length;
    component.words.set([]);
    openNewWord();
    component.onImageSelected(image);
    component.save();

    expect(component.editing()?.id).toBe(word.id);
    expect(component.dialogOpen()).toBe(true);
    expect(component.selectedImage()).toBe(image);
    expect(component.imagePreviewUrl()).toBe('blob:preview-1');
    expect(component.saveError()).toContain('Слово сохранено');
    expect(component.saving()).toBe(false);
    expect(revokePreview).not.toHaveBeenCalled();
    expect(api.words).toHaveBeenCalledTimes(initialLoads + 1);
    expect(component.words()).toEqual([word]);

    component.draft.translation = 'Кофе (исправлено)';
    component.save();
    expect(api.createWord).toHaveBeenCalledTimes(1);
    expect(api.updateWord).toHaveBeenCalledWith(word.id, expect.objectContaining({translation: 'Кофе (исправлено)'}));
    expect(api.uploadWordMedia).toHaveBeenCalledTimes(2);
    expect(component.dialogOpen()).toBe(false);
    expect(component.selectedImage()).toBeNull();
    expect(revokePreview).toHaveBeenCalledWith('blob:preview-1');
  });

  it('blocks duplicate saves and closing while the initial word request is pending', () => {
    const pending = new Subject<AdminWord>();
    api.createWord.mockReturnValue(pending);
    openNewWord();
    component.save();
    component.save();
    component.closeDialog();

    expect(api.createWord).toHaveBeenCalledTimes(1);
    expect(component.saving()).toBe(true);
    expect(component.dialogOpen()).toBe(true);
    pending.next(word);
    pending.complete();
    expect(component.saving()).toBe(false);
    expect(component.dialogOpen()).toBe(false);
  });

  it('blocks duplicate saves and image replacement throughout a pending upload', () => {
    const pending = new Subject<AdminWord>();
    api.uploadWordMedia.mockReturnValue(pending);
    openNewWord();
    component.onImageSelected(image);
    component.save();
    component.save();
    component.onImageSelected(new File(['other'], 'other.png', {type: 'image/png'}));
    component.closeDialog();

    expect(api.createWord).toHaveBeenCalledTimes(1);
    expect(api.updateWord).not.toHaveBeenCalled();
    expect(api.uploadWordMedia).toHaveBeenCalledTimes(1);
    expect(component.saving()).toBe(true);
    expect(component.selectedImage()).toBe(image);
    expect(component.dialogOpen()).toBe(true);
    expect(createPreview).toHaveBeenCalledTimes(1);
    pending.next({...word, imageUrl: '/uploads/new.png'});
    pending.complete();
    expect(component.saving()).toBe(false);
    expect(component.dialogOpen()).toBe(false);
  });

  it('rejects empty required text even when save is called directly', () => {
    openNewWord();
    component.draft.hangul = '  ';
    component.save();
    expect(api.createWord).not.toHaveBeenCalled();
    expect(api.uploadWordMedia).not.toHaveBeenCalled();
  });

  it.each([
    ['image/svg+xml', 1], ['text/plain', 1], ['', 1],
    ['image/png', 0], ['image/png', 5 * 1024 * 1024 + 1],
  ])('rejects invalid image MIME %s or size %i without creating a preview', (type, size) => {
    openNewWord();
    const invalid = new File(['x'], 'invalid', {type});
    Object.defineProperty(invalid, 'size', {value: size});
    component.onImageSelected(invalid);
    expect(component.selectedImage()).toBeNull();
    expect(component.imagePreviewUrl()).toBeNull();
    expect(component.imageError()).toBeTruthy();
    expect(createPreview).not.toHaveBeenCalled();
    expect(api.uploadWordMedia).not.toHaveBeenCalled();
  });

  it.each(['image/png', 'image/jpeg', 'image/webp'])('accepts %s up to the exact 5 MiB boundary', type => {
    const valid = new File(['x'], 'valid', {type});
    Object.defineProperty(valid, 'size', {value: 5 * 1024 * 1024});
    component.onImageSelected(valid);
    expect(component.selectedImage()).toBe(valid);
    expect(component.imagePreviewUrl()).toBe('blob:preview-1');
    expect(component.imageError()).toBeNull();
  });

  it('clears an earlier pending preview on invalid replacement and recovers with a valid selection', () => {
    component.onImageSelected(image);
    component.onImageSelected(new File(['svg'], 'bad.svg', {type: 'image/svg+xml'}));
    expect(revokePreview).toHaveBeenCalledWith('blob:preview-1');
    expect(component.selectedImage()).toBeNull();
    expect(component.imagePreviewUrl()).toBeNull();
    expect(component.imageError()).toBeTruthy();
    component.onImageSelected(image);
    expect(component.imageError()).toBeNull();
    expect(component.selectedImage()).toBe(image);
  });

  it('revokes previews on replacement, close and component destruction', () => {
    createPreview.mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second').mockReturnValueOnce('blob:third');
    openNewWord();
    component.onImageSelected(image);
    component.onImageSelected(image);
    expect(revokePreview).toHaveBeenCalledWith('blob:first');
    component.closeDialog();
    expect(revokePreview).toHaveBeenCalledWith('blob:second');
    expect(component.selectedImage()).toBeNull();
    component.openCreate();
    component.onImageSelected(image);
    fixture.destroy();
    expect(revokePreview).toHaveBeenCalledWith('blob:third');
    expect(revokePreview).toHaveBeenCalledTimes(3);
  });

  it('leaves the existing table audio upload available', () => {
    const audio = new File(['audio'], 'word.mp3', {type: 'audio/mpeg'});
    component.upload(word, audio, 'audio');
    expect(api.uploadWordMedia).toHaveBeenCalledWith(word.id, audio, 'audio');
  });

  it('shows the image preview and blocks dialog controls until upload succeeds or fails', async () => {
    const pending = new Subject<AdminWord>();
    api.uploadWordMedia.mockReturnValue(pending);
    component.openEdit(word);
    fixture.detectChanges();
    await fixture.whenStable();
    const preview: HTMLImageElement = fixture.nativeElement.querySelector('.word-preview');
    expect(preview.getAttribute('src')).toBe('/uploads/old.png');

    component.onImageSelected(image);
    fixture.detectChanges();
    expect(preview.getAttribute('src')).toBe('blob:preview-1');
    component.save();
    fixture.detectChanges();
    const dialog = fixture.debugElement.query(By.directive(HgDialogComponent)).componentInstance as HgDialogComponent;
    expect(dialog.closable()).toBe(false);
    expect(dialog.closeOnEscape()).toBe(false);
    const picker: HTMLInputElement = fixture.nativeElement.querySelector('hg-dialog input[type=file]');
    expect(picker.disabled).toBe(true);
    expect(picker.accept).toBe('image/png,image/jpeg,image/webp');
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('hg-dialog hg-button button');
    expect(Array.from(buttons).every(button => button.disabled)).toBe(true);

    pending.error(new Error('upload failed'));
    fixture.detectChanges();
    expect(dialog.closable()).toBe(true);
    expect(dialog.closeOnEscape()).toBe(true);
    expect(picker.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('hg-dialog [role=alert]').textContent).toContain('Слово сохранено');
    expect(preview.getAttribute('src')).toBe('blob:preview-1');
  });

  it.each([null, '', '   '])('uses the default drawing in thumbnails for image URL %p', imageUrl => {
    component.words.set([{...word, imageUrl}]);
    fixture.detectChanges();
    const thumbnail: HTMLImageElement = fixture.nativeElement.querySelector('tbody img');
    expect(thumbnail.getAttribute('src')).toBe(component.defaultWordImage);
  });

  it('replaces a broken thumbnail once and accepts a newly uploaded image URL', () => {
    fixture.detectChanges();
    const thumbnail: HTMLImageElement = fixture.nativeElement.querySelector('tbody img');
    thumbnail.dispatchEvent(new Event('error'));
    expect(thumbnail.getAttribute('src')).toBe(component.defaultWordImage);
    const setSrc = jest.spyOn(thumbnail, 'src', 'set');
    thumbnail.dispatchEvent(new Event('error'));
    expect(setSrc).not.toHaveBeenCalled();
    component.words.set([{...word, imageUrl: '/uploads/replacement.png'}]);
    fixture.detectChanges();
    expect(thumbnail.getAttribute('src')).toBe('/uploads/replacement.png');
  });
});
