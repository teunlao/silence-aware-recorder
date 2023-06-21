type OnVolumeChange = (volume: number) => void;
type OnDataAvailable = (data: Blob) => void | undefined;

export interface SilenceAwareRecorderOptions {
  minDecibels?: number;
  onDataAvailable?: OnDataAvailable;
  onVolumeChange?: OnVolumeChange;
  silenceDuration?: number;
  silentThreshold?: number;
}

class SilenceAwareRecorder {
  private audioContext: AudioContext | null;

  private mediaStreamSource: MediaStreamAudioSourceNode | null;

  private analyser: AnalyserNode | null;

  private mediaRecorder: MediaRecorder | null;

  private silenceTimeout: ReturnType<typeof setTimeout> | null;

  private readonly silenceThreshold: number;

  private readonly silenceDuration: number;

  private readonly minDecibels: number;

  private readonly onVolumeChange?: OnVolumeChange;

  private readonly onDataAvailable?: OnDataAvailable;

  private isSilence: boolean;

  private hasSoundStarted: boolean;

  constructor({
    onVolumeChange,
    onDataAvailable,
    silenceDuration = 2500,
    silentThreshold = -50,
    minDecibels = -100,
  }: SilenceAwareRecorderOptions) {
    this.audioContext = null;
    this.mediaStreamSource = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.silenceTimeout = null;
    this.silenceThreshold = silentThreshold;
    this.silenceDuration = silenceDuration;
    this.minDecibels = minDecibels;
    this.onVolumeChange = onVolumeChange;
    this.onDataAvailable = onDataAvailable;
    this.isSilence = false;
    this.hasSoundStarted = false;
  }

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      this.audioContext = new AudioContext();
      this.mediaStreamSource =
        this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.minDecibels = this.minDecibels;
      this.mediaStreamSource.connect(this.analyser);
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.hasSoundStarted) {
          this.onDataAvailable?.(event.data);
        }
      };

      this.mediaRecorder.start();

      this.checkForSilence();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error getting audio stream:', err);
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder) {
      if (this.hasSoundStarted) {
        this.mediaRecorder.requestData();
        setTimeout(() => {
          this.mediaRecorder?.stop();
          this.mediaRecorder?.stream
            ?.getTracks()
            .forEach((track) => track.stop());
          this.audioContext?.close();
          this.hasSoundStarted = false;
        }, 100); // adjust this delay as necessary
      } else {
        this.mediaRecorder.stop();
        this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        this.audioContext?.close();
        this.hasSoundStarted = false;
      }
    }
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }

  checkForSilence(): void {
    if (!this.mediaRecorder) {
      throw new Error('MediaRecorder is not available');
    }

    if (!this.analyser) {
      throw new Error('Analyser is not available');
    }

    const bufferLength = this.analyser.fftSize;
    const amplitudeArray = new Float32Array(bufferLength || 0);
    this.analyser.getFloatTimeDomainData(amplitudeArray);

    let values = 0;
    for (let i = 0; i < amplitudeArray.length; i++) {
      values += amplitudeArray[i] * amplitudeArray[i]; // square value
    }
    const average = Math.sqrt(values / amplitudeArray.length); // calculate rms
    const volume = 20 * Math.log10(average); // convert to dB

    this.onVolumeChange?.(volume);

    if (volume < this.silenceThreshold) {
      if (!this.silenceTimeout) {
        this.silenceTimeout = setTimeout(() => {
          this.mediaRecorder?.stop();
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

    requestAnimationFrame(() => this.checkForSilence());
  }
}

export default SilenceAwareRecorder;
