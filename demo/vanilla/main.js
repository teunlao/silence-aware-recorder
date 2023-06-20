import './style.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <div>
    <button id="startButton">Начать</button>
    <button id="stopButton">Остановить</button>
    <div id="audio-list" style="display: flex; flex-direction: column"></div>
  </div>
`;

const silenceThreshold = -50; // Set to a very low volume level (almost silence)
const silenceDuration = 2;    // duration of silence in seconds
const checkInterval = 100;    // interval to check for silence in milliseconds

let audioContext;
let analyser;
let mediaRecorder;
let silenceTimeout;

const startButton = document.querySelector('#startButton');
const stopButton = document.querySelector('#stopButton');

startButton.addEventListener('click', start);
stopButton.addEventListener('click', stop);

async function start() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();

  const mediaStreamSource = audioContext.createMediaStreamSource(stream);
  mediaStreamSource.connect(analyser);

  checkForSilence(stream);
}

function stop() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder = null;
  }
}

function checkForSilence(stream) {
  const volume = getVolume();
  console.log(volume)

  if (volume > silenceThreshold && (!mediaRecorder || mediaRecorder.state === 'inactive')) {
    startRecording(stream);
  } else if (volume <= silenceThreshold && mediaRecorder && mediaRecorder.state === 'recording') {
    silenceTimeout = setTimeout(() => {
      mediaRecorder.stop();
      silenceTimeout = null;
    }, silenceDuration * 1000);
  }

  setTimeout(() => checkForSilence(stream), checkInterval);
}

function getVolume() {
  const bufferLength = analyser.fftSize;
  const amplitudeArray = new Float32Array(bufferLength);
  analyser.getFloatTimeDomainData(amplitudeArray);

  let values = 0;
  for (let i = 0; i < amplitudeArray.length; i++) {
    values += amplitudeArray[i] * amplitudeArray[i];
  }

  const average = Math.sqrt(values / amplitudeArray.length);
  return 20 * Math.log10(average);  // convert to dB
}

function startRecording(stream) {
  const chunks = [];
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = event => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };
  mediaRecorder.onstop = () => addAudioElement(chunks);

  mediaRecorder.start();
}

function addAudioElement(chunks) {
  const blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
  const url = URL.createObjectURL(blob);

  const audio = document.createElement('audio');
  audio.src = url;
  audio.controls = true;

  document.querySelector('#audio-list').appendChild(audio);
}

