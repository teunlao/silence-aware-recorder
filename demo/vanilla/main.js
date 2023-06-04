import './style.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <div>
    <button id="startButton">Начать</button>
    <button id="stopButton">Остановить</button>
    <div id="audio-list" style="display: flex; flex-direction: column"></div>
  </div>
`;

const main = async () => {
  let audioContext;
  let mediaStreamSource;
  let analyser;
  let chunks = [];
  let mediaRecorder;
  let silenceTimeout;

// The silence threshold and the silence duration (in seconds)
  let silenceThreshold = 100; // Set to a very low volume level (almost silence)
  const silenceDuration = 2;

// Set minimum decibel level
  const minDecibels = -80;

  document.querySelector('#startButton').addEventListener('click', () => {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        audioContext = new AudioContext();
        mediaStreamSource = audioContext.createMediaStreamSource(stream);

        // Create an AnalyserNode
        analyser = audioContext.createAnalyser();
        analyser.minDecibels = minDecibels;
        mediaStreamSource.connect(analyser);

        // Start the MediaRecorder with the audio stream
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();

        // When data is available, push it to the chunks array
        mediaRecorder.ondataavailable = async event => {
          console.log(event)
          if (event.data.size > 6600 * silenceDuration) {
            chunks.push(event.data);
          }
        };

        // When the media recorder stops, create an audio element with the recorded data
        mediaRecorder.onstop = () => {
          if (chunks.length > 0) { // Make sure we have some recorded data
            const blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
            const url = URL.createObjectURL(blob);
            const audio = document.createElement('audio');
            audio.src = url;
            audio.controls = true;
            document.querySelector('#audio-list').appendChild(audio);
            chunks = [];
          }
        };

        // Start checking for silence
        checkForSilence();
      })
      .catch(err => console.error('Error getting audio stream:', err));
  })

  function checkForSilence() {
    const bufferLength = analyser.frequencyBinCount;
    const amplitudeArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(amplitudeArray);

    let aboveThreshold = false;
    for(let i = 0; i < bufferLength; i++) {
      if(amplitudeArray[i] > silenceThreshold) {
        console.log(amplitudeArray[i])
        console.log('above threshold')
        aboveThreshold = true;
        break;
      }
    }

    if(aboveThreshold) {
      if(silenceTimeout) {
        clearTimeout(silenceTimeout);
        silenceTimeout = null;
      }
    } else {
      if(!silenceTimeout) {
        silenceTimeout = setTimeout(() => {

          mediaRecorder.stop();
          silenceTimeout = null;
          setTimeout(() => mediaRecorder.start(), 100);
        }, silenceDuration * 1000);
      }
    }

    setTimeout(checkForSilence, 100);
  }
};

main()
const second = () => {
  const MIN_DECIBELS = -45;

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();

      const audioChunks = [];
      mediaRecorder.addEventListener("dataavailable", event => {
        audioChunks.push(event.data);
      });

      const audioContext = new AudioContext();
      const audioStreamSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.minDecibels = MIN_DECIBELS;
      audioStreamSource.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const domainData = new Uint8Array(bufferLength);

      let soundDetected = false;

      const detectSound = () => {
        console.log({ soundDetected });
        if (soundDetected) {
          return
        }

        analyser.getByteFrequencyData(domainData);

        for (let i = 0; i < bufferLength; i++) {
          const value = domainData[i];

          if (domainData[i] > 0) {
            soundDetected = true
          }
        }

        window.requestAnimationFrame(detectSound);
      };

      window.requestAnimationFrame(detectSound);

      mediaRecorder.addEventListener("stop", () => {
        const blob = new Blob(audioChunks, { 'type' : 'audio/ogg; codecs=opus' });
        const url = URL.createObjectURL(blob);
        const audio = document.createElement('audio');
        audio.src = url;
        audio.controls = true;
        document.querySelector('#audio-list').appendChild(audio);

        console.log({ soundDetected });
      });
    });
}

// second()