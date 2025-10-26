# React Microphone Visualizer (Vite 7 + React 19)

Пример демонстрирует, как использовать `@saraudio/react` в браузере: приложение поднимает пайплайн с energy VAD, запускает микрофон и отображает активность речи в реальном времени.

## Скрипты

```bash
pnpm install                           # один раз в корне монорепы
pnpm --filter @saraudio/example-react-mic-visualizer dev      # запустить dev-сервер на http://localhost:5173
pnpm --filter @saraudio/example-react-mic-visualizer build    # production-сборка
pnpm --filter @saraudio/example-react-mic-visualizer preview  # предпросмотр сборки
pnpm --filter @saraudio/example-react-mic-visualizer typecheck
pnpm --filter @saraudio/example-react-mic-visualizer lint
```

## Особенности

- React 19 + Vite 7.
- `SaraudioProvider` создаёт браузерный runtime автоматически.
- `useSaraudioPipeline` + `useSaraudioMicrophone` формируют поток PCM и сегменты (используя выбранный микрофон).
- VAD метрика отображается в виде бара; список сегментов обновляется динамически.
- Встроенный выбор входного устройства и обновление списка без перезапуска приложения.
- Хук сообщает о fallback'ах (например, переход на MediaRecorder).

## Требования

- Node ≥ 18, pnpm ≥ 10.
- Запускать на `localhost` по HTTPS/HTTP или на прод-домене с HTTPS, иначе браузер не выдаст доступ к микрофону.
*** End Patch
