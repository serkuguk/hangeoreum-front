# Готовность: 8 ноября 2026

## Готово

- Эталон пользователя скопирован в `references/turnaround-user.png`; происхождение,
  палитра и реконструированные детали описаны в `references.md` и `character-spec.md`.
- Созданы редактируемый `blender/zanmang_loopy.blend` и самостоятельный
  `exports/3d/zanmang_loopy.glb`: один скелет, 35 мешей, **19 576 треугольников,
  641 860 байт**, без текстур, шесть реально экспортированных анимаций.
- Клипы: Idle, Wave, Walk, Point, Celebrate, Sad. Длительность около 1.96 секунды,
  Walk — 1.29 секунды. Перемещение Root не запечено в ходьбу.
- Шесть прозрачных PNG 640 × 640 и шесть lossless WebP: neutral, hello, happy,
  thinking, sad, pointing. Автоматически проверены alpha-канал и прозрачные углы.
- Листы `concept/turnaround.png`, `expressions.png`, `poses.png`; ракурсы и пять
  кадров каждого клипа в `docs/inspection/`. Все производные листы помечены INFERRED.
- `Mascot3dComponent`: загрузка при попадании в viewport, типизированные клипы,
  поворот, ограниченное перемещение, PNG fallback, reduced motion, очистка ресурсов.
  Никакая существующая страница, маршрут или маскот не заменены.
- В production assets копируется только `exports/**`. Проверены 12 изображений
  и GLB; референсы, BLEND, скрипты, документация и inspection туда не попадают.

## Проверки

| Проверка | Результат |
| --- | --- |
| Blender 5.2.2 LTS, фоновый запуск и сохранение/открытие BLEND | PASS |
| Две генерации в одном процессе, отсутствие дублей | PASS: оба раза 44 объекта, 6 действий, 35 мешей; чужой Cube сохранён |
| Все кадры шести действий: конечные координаты, локти, пол | PASS; минимальная Z ступней ≈ 0, ниже пола не уходят |
| Структурный GLB check: веса, индексы, временные шкалы, реальные изменения | PASS |
| Khronos glTF Validator 2.0.0-dev.3.10 | PASS: 0 ошибок, 0 предупреждений, 0 информационных замечаний |
| Новые Jest-тесты компонента/сцены | PASS: 12 тестов, включая завершение старой загрузки после новой |
| Регрессия существующего MascotComponent | PASS: 2 теста |
| Строгий Angular ngc для не подключённого компонента | PASS |
| Production build и временный Angular host | PASS; существующие предупреждения о размерах перечислены ниже |
| Реальный Chromium, desktop 1280 × 900 / mobile viewport 390 × 844 | PASS в локальном стенде; снимки в inspection |
| Архитектурная проверка всего приложения | FAIL: существующие нарушения админки; новых нарушений в задаче не обнаружено |

В браузере загружен именно экспортированный GLB, все шесть `play(...)` вернули true.
Проверены поворот на 30°, затем стрелкой ещё на 15°, перемещение к границе
(258,118) при размере 380 и контейнере 638 × 498. После сужения viewport размер
стал 340, X ограничился нулём; горизонтального переполнения нет.
При reduced motion два снимка canvas с интервалом 350 ms одинаковы, CSS transition
равен 0s. Ошибочный URL показал PNG; смена обратно восстановила модель. Событие
`webglcontextlost` показало fallback. Это не проверка физического отключения GPU.

Подробные измерения: `glb-metrics.json`, `blender-check.json`, `gltf-validator.json`.
Сводка независимого обзора: `review.md`. Открытых замечаний внутри задачи нет;
общий gate приложения остаётся FAIL по исходным нарушениям админки.

После исправления гонки выполнен повторный прогон desktop/mobile и reduced motion.
Дополнительно в настоящем браузере задержана загрузка A, загружена B и выполнен
поворот 0.9 rad при отключённой анимации; завершение A не изменило canvas.
Итоговый объединённый Jest: **20 PASS / 2 FAIL**, три набора PASS и один FAIL;
оба падения — те же исходные архитектурные проверки админки.

## Не готово

- Сложный лицевой риг и сидячая поза не реализованы; см. `missing-art.md`.
  Работают простые реакции положением головы, рук и костью рта.
- Полный Jest-набор приложения, реальные iOS/Android-устройства и публикация не запускались.
- Архитектурные тесты уже до работы находили raw input в exercise-editor и три
  импорта приватной модели learning из admin. Они сохранены без исправлений.
- Существующие build warnings: initial 1.26 MB при warning-бюджете 1.2 MB;
  SCSS карты курса 8.91 kB при warning-бюджете 8 kB. Сборка завершается успешно.
- Blender сообщает о невозможности записать внешний thumbnail и remap штатной
  библиотеки кистей вне проекта. Сохранение/открытие BLEND, рендеры и экспорт проходят.

## Нужны действия пользователя

Для локального просмотра и использования файлов обязательных действий нет:
откройте BLEND в Blender либо подключите компонент по `angular.md`.
Размещение персонажа на страницах оставлено пользователю по его просьбе.
Для публичного/коммерческого использования отдельно требуется разрешение правообладателя.

## Команды

Выполнять в корне `coreano-front`. Blender уже установлен, дополнительные тяжёлые
пакеты не нужны. Для изображений используется системный Python с Pillow.

```powershell
$loopyBlender = 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe'
& $loopyBlender --background --factory-startup --python-exit-code 1 --python assets/zanmang-loopy/scripts/build_loopy.py
& $loopyBlender --background --factory-startup --python-exit-code 1 --python assets/zanmang-loopy/scripts/check_loopy.py
& $loopyBlender --background --factory-startup --python-exit-code 1 --python assets/zanmang-loopy/scripts/export_loopy.py
python assets/zanmang-loopy/scripts/prepare_images.py
python assets/zanmang-loopy/scripts/check_loopy.py
node --experimental-vm-modules --no-warnings node_modules/jest/bin/jest.js --runInBand src/app/shared/components/hg/mascot3d/mascot3d.component.spec.ts src/app/shared/components/hg/mascot3d/mascot3d.scene.spec.ts src/app/shared/components/hg/mascot/mascot.component.spec.ts
node node_modules/@angular/cli/bin/ng.js build --configuration production
node node_modules/@angular/cli/bin/ng.js serve
```

Для быстрой генерации BLEND без рендеров добавьте после build_loopy.py `-- --no-render`.
Blender check пересоздаёт только собственные LP_ данные и выходной BLEND дважды;
пользовательскую ручную правку выходного файла сохраните отдельным файлом заранее.

`pnpm start`/`pnpm build` также штатные команды проекта. Установленный pnpm 12.10.1
не смог проверить закреплённый 12.3.4 в ограниченной сети. Для зависимостей использован
явный `pnpm.exe with current add`, без изменения packageManager или отключения проверки
подписей; проверки запускались напрямую через Node.

Официальный валидатор установлен только во временную папку, не в зависимости приложения:

```powershell
npm install --prefix tmp/loopy-validator --no-package-lock --no-save --ignore-scripts gltf-validator@2.0.0-dev.3.10
node -e "const fs=require('node:fs'); require('./tmp/loopy-validator/node_modules/gltf-validator').validateBytes(new Uint8Array(fs.readFileSync('assets/zanmang-loopy/exports/3d/zanmang_loopy.glb'))).then(r=>{console.log(r.issues);if(r.issues.numErrors)process.exitCode=1})"
```

## Ограничения точности

Модель следует предоставленному листу: силуэт, розовый корпус, белое брюшко,
хохолок, бордовые детали и зубы. Выполнен осмотр спереди, сбоку, сзади и по клипам.
Глубина, скрытые поверхности и движения реконструированы. Точное совпадение с
официальным Zanmang Loopy и художественное одобрение правообладателя не заявляются.
3D-освещение отличается от плоской заливки и контура оригинального PNG.

## Права

Локальный прототип по файлу пользователя не подтверждает права на персонажа.
Ничего не развёрнуто и не опубликовано. Перед публичным/платным размещением
Zanmang Loopy необходимо соответствующее разрешение/лицензия.
