import React from 'react';
import './index.css';
import { useSilenceAwareRecorder } from 'silence-aware-recorder';

const App = () => {
  const [volume, setVolume] = React.useState(0);

  const { startRecording, stopRecording } = useSilenceAwareRecorder({
    onDataAvailable: (data) => {
      console.log('data', data);
    },
    onVolumeChange: (data) => {
      setVolume(data);
    },
  });

  return (
    <div>
      <h3 id="volume">{volume.toFixed(2)}</h3>
      <button id="startButton" onClick={startRecording}>
        Начать
      </button>
      <button id="stopButton" onClick={stopRecording}>
        Остановить
      </button>
      <div
        id="audio-list"
        style={{ display: 'flex', flexDirection: 'column' }}
      />
    </div>
  );
};

export default App;
