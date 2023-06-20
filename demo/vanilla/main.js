import './style.css';
import SilenceAwareRecorder from '../../src/lib/SilenceAwareRecorder';

const app = document.querySelector('#app');
app.innerHTML = `
  <div>
    <h3 id="volume"></h3>
    <button id="startButton">Начать</button>
    <button id="stopButton">Остановить</button>
    <div id="audio-list" style="display: flex; flex-direction: column"></div>
  </div>
`;

const silenceAwareRecorder = new SilenceAwareRecorder({
  silenceDuration: 2000,
  silenceThreshold: -50,
});

silenceAwareRecorder.onDataAvailable = (data) => {
  console.log(data);

  const audioURL = URL.createObjectURL(data);
  const audio = new Audio(audioURL);

  const audioItem = document.createElement('div');
  audioItem.innerHTML = `
    <audio controls src="${audioURL}"></audio>
  `;
  document.querySelector('#audio-list').appendChild(audioItem);
};

silenceAwareRecorder.onVolumeChange = (volume) => {
  document.querySelector('#volume').innerHTML = `Volume: ${volume.toFixed(
    2
  )} dB`;
};

document.querySelector('#startButton').addEventListener('click', () => {
  silenceAwareRecorder.startRecording();
});

document.querySelector('#stopButton').addEventListener('click', () => {
  silenceAwareRecorder.stopRecording();
});
