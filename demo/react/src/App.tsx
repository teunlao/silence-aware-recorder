import React, { useEffect } from 'react';
import './index.css';
// import useSilenceAwareRecorder from '../../../src/react/useSilenceAwareRecorder';
import useSilenceAwareRecorder from 'silence-aware-recorder/react';

const App = () => {
  const [volume, setVolume] = React.useState(0);
  const [selectedDevice, setSelectedDevice] = React.useState('');
  const [devices, setDevices] = React.useState<MediaDeviceInfo[] | undefined>([]);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((data) => {
      console.log('data', data);
      setDevices(data);
    });
  }, []);

  const { startRecording, stopRecording, isRecording, deviceId, setDevice } = useSilenceAwareRecorder({
    silentThreshold: -30,
    minDecibels: -100,
    onDataAvailable: (data) => {
      console.log('data', data);
    },
    onVolumeChange: (data) => {
      setVolume(data);
    },
  });

  useEffect(() => {
    console.log('selectedDevice', selectedDevice);
    setDevice(selectedDevice);
  }, [selectedDevice]);

  return (
    <div>
      <h3>Is Recording: {isRecording.toString()} </h3>
      <div>
        <label> Microphone</label>
        <select
          value={selectedDevice}
          onChange={(event) => {
            setSelectedDevice(event.target.value);
          }}
        >
          {devices &&
            devices.map((device, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <option key={device.deviceId + index} value={device.deviceId}>
                {device.label || `Microphone ${device.label}`}
              </option>
            ))}
        </select>
      </div>
      <h3>Device ID: {deviceId.toString()} </h3>
      <h3 id="volume">Volume: {volume.toFixed(2)}</h3>
      <button id="startButton" onClick={startRecording}>
        Начать
      </button>
      <button id="stopButton" onClick={stopRecording}>
        Остановить
      </button>
      <div id="audio-list" style={{ display: 'flex', flexDirection: 'column' }} />
    </div>
  );
};

export default App;
