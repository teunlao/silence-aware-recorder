# SilenceAwareRecorder

`SilenceAwareRecorder` is an audio recording utility for web environments. This library uses the Web Audio API to record audio, automatically detecting and managing periods of silence. In addition, a React Hook binding is provided for seamless integration with React-based applications.

## Features

- Continuous measurement of audio volume and triggering of a callback function when the volume changes.
- Management of silent periods by stopping and restarting the recording when sound is detected.
- Provision of recorded audio data chunks via a callback function.

## Installation

```shell
npm install silence-aware-recorder
```

## Usage

### Standard JavaScript

First, import `SilenceAwareRecorder`:

```javascript
import SilenceAwareRecorder from 'silence-aware-recorder';
```

Then create an instance of `SilenceAwareRecorder` with desired options:

```javascript
const recorder = new SilenceAwareRecorder({
  onDataAvailable: (data) => console.log(data),
  onVolumeChange: (volume) => console.log(volume),
  silenceDuration: 2500,
  silentThreshold: -50,
  minDecibels: -100,
});
```

Start recording with:

```javascript
recorder.startRecording();
```

And stop recording with:

```javascript
recorder.stopRecording();
```

### React Hook

You can use `useSilenceAwareRecorder` hook in your React application for seamless integration:

```javascript
import useSilenceAwareRecorder from 'silence-aware-recorder/react';

const YourComponent = () => {
  const { startRecording, stopRecording } = useSilenceAwareRecorder({
    onDataAvailable: (data) => console.log(data),
    onVolumeChange: (volume) => console.log(volume),
    silenceDuration: 2500,
    silentThreshold: -50,
    minDecibels: -100,
  });

  return (
    <div>
      <button onClick={startRecording}>Start</button>
      <button onClick={stopRecording}>Stop</button>
    </div>
  );
};
```

## API

### SilenceAwareRecorderOptions

This is the options object that you can pass to the `SilenceAwareRecorder` constructor or the `useSilenceAwareRecorder` hook. It has the following optional properties:

- `onDataAvailable`: Callback that is fired when audio data is available.
- `onVolumeChange`: Callback that is fired when the volume changes.
- `silenceDuration`: Duration of silence in milliseconds to wait before stopping the recording. Defaults to `2500`.
- `silentThreshold`: Decibel level below which is considered silence. Defaults to `-50`.
- `minDecibels`: The minimum power value in the scaling range for the FFT analysis data for conversion to decibels. Defaults to `-100`.

### `startRecording()`

This method starts the recording process. It returns a promise that resolves when the recording has successfully started.

### `stopRecording()`

This method stops the recording process. It also ensures that all remaining audio data (not silence) is provided via the `onDataAvailable` callback before the recording is fully stopped.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
