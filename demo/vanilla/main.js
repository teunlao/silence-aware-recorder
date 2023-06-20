import './style.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <div>
    <h3 id="volume"></h3>
    <button id="startButton">Начать</button>
    <button id="stopButton">Остановить</button>
    <div id="audio-list" style="display: flex; flex-direction: column"></div>
  </div>
`;

class AudioAnalyzer {
  constructor(onVolumeChange, onDataAvailable) {
    this.audioContext = null;
    this.mediaStreamSource = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.silenceTimeout = null;
    this.silenceThreshold = -50;
    this.silenceDuration = 2500;
    this.minDecibels = -100;
    this.onVolumeChange = onVolumeChange;
    this.onDataAvailable = onDataAvailable;
    this.isSilence = false;
    this.hasSoundStarted = false;
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioContext = new AudioContext();
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.minDecibels = this.minDecibels;
      this.mediaStreamSource.connect(this.analyser);
      this.mediaRecorder = new MediaRecorder(stream);

      // When data is available, push it to the chunks array
      this.mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0 && this.hasSoundStarted) {
          this.onDataAvailable(event.data);
        }
      };

      this.mediaRecorder.start();

      // Start checking for silence
      this.checkForSilence();
    } catch (err) {
      console.error('Error getting audio stream:', err);
    }
  }

  stopRecording() {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
        this.silenceTimeout = null;
      }
      this.audioContext.close();
    }
    this.hasSoundStarted = false;
  }

  checkForSilence() {
    const bufferLength = this.analyser.fftSize;
    const amplitudeArray = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(amplitudeArray);

    let values = 0;
    for (let i = 0; i < amplitudeArray.length; i++) {
      values += amplitudeArray[i] * amplitudeArray[i]; // square value
    }
    const average = Math.sqrt(values / amplitudeArray.length); // calculate rms
    const volume = 20 * Math.log10(average); // convert to dB

    // Call the onVolumeChange callback with the current volume
    this.onVolumeChange(volume);

    if (volume < this.silenceThreshold) {
      if (!this.silenceTimeout) {
        this.silenceTimeout = setTimeout(() => {
          this.mediaRecorder.stop();
          this.isSilence = true;
          this.silenceTimeout = null;
        }, this.silenceDuration);
      }
    } else {
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
        this.silenceTimeout = null;
      }
      if (this.isSilence) {
        this.mediaRecorder.start();
        this.isSilence = false;
      }
      if (!this.hasSoundStarted) {
        this.hasSoundStarted = true;
      }
    }

    setTimeout(() => this.checkForSilence(), 100);
  }
}


const audioAnalyzer = new AudioAnalyzer();

audioAnalyzer.onDataAvailable = data => {
 console.log(data);

  const audioURL = URL.createObjectURL(data);
  const audio = new Audio(audioURL);

  const audioItem = document.createElement('div');
  audioItem.innerHTML = `
    <audio controls src="${audioURL}"></audio>
  `;
  document.querySelector('#audio-list').appendChild(audioItem);
}

audioAnalyzer.onVolumeChange = volume => {
  document.querySelector('#volume').innerHTML = `Volume: ${volume.toFixed(2)} dB`;
};

document.querySelector('#startButton').addEventListener('click', () => {
  audioAnalyzer.startRecording();
});

document.querySelector('#stopButton').addEventListener('click', () => {
  audioAnalyzer.stopRecording();
});
