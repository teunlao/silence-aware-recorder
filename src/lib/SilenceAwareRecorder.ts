export type OnVolumeChange = (volume: number) => void;
export type OnDataAvailable = (data: Blob) => void | undefined;

export interface SilenceAwareRecorderOptions {
  deviceId?: string;
  minDecibels?: number;
  onDataAvailable?: OnDataAvailable;

  onVolumeChange?: OnVolumeChange;
  setDeviceId?: (deviceId: string) => void;

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

  public deviceId: string | null;

  public isRecording: boolean;

  constructor({
    onVolumeChange,
    onDataAvailable,
    silenceDuration = 2500,
    silentThreshold = -50,
    minDecibels = -100,
    deviceId = 'default',
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
    this.deviceId = deviceId;
    this.isRecording = false;
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) {
      return;
    }

    try {
      const stream = await this.getAudioStream();
      this.setupAudioContext(stream);
      this.setupMediaRecorder(stream);
      this.isRecording = true;
      this.checkForSilence();
    } catch (err) {
      console.error('Error getting audio stream:', err);
    }
  }

  private async getAudioStream(): Promise<MediaStream> {
    // eslint-disable-next-line no-undef
    const constraints: MediaStreamConstraints = {
      audio: this.deviceId ? { deviceId: { exact: this.deviceId } } : true,
      video: false,
    };

    return navigator.mediaDevices.getUserMedia(constraints);
  }

  private setupAudioContext(stream: MediaStream): void {
    this.audioContext = new AudioContext();
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.minDecibels = this.minDecibels;
    this.mediaStreamSource.connect(this.analyser);
  }

  private setupMediaRecorder(stream: MediaStream): void {
    this.mediaRecorder = new MediaRecorder(stream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.hasSoundStarted) {
        this.onDataAvailable?.(event.data);
      }
    };

    this.mediaRecorder.start();
  }

  async getAvailableDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices;
  }

  setDevice(deviceId: string): void {
    if (this.deviceId !== deviceId) {
      this.deviceId = deviceId;
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        // If the recording is running, stop it before switching devices
        this.stopRecording();
      }
    }
  }

  stopRecording(): void {
    if (!this.isRecording) {
      return;
    }

    if (
      this.mediaRecorder &&
      this.hasSoundStarted &&
      this.mediaRecorder.state === 'recording'
    ) {
      this.mediaRecorder.requestData();
      setTimeout(() => {
        this.cleanUp();
      }, 100); // adjust this delay as necessary
    } else {
      this.cleanUp();
    }

    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }

  private cleanUp(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder?.stop();
    }
    this.mediaRecorder?.stream?.getTracks().forEach((track) => track.stop());
    this.audioContext?.close();
    this.hasSoundStarted = false;
    this.isRecording = false;
  }

  private checkForSilence(): void {
    if (!this.mediaRecorder) {
      throw new Error('MediaRecorder is not available');
    }

    if (!this.analyser) {
      throw new Error('Analyser is not available');
    }

    const bufferLength = this.analyser.fftSize;
    const amplitudeArray = new Float32Array(bufferLength || 0);
    this.analyser.getFloatTimeDomainData(amplitudeArray);

    const volume = this.computeVolume(amplitudeArray);

    this.onVolumeChange?.(volume);

    if (volume < this.silenceThreshold) {
      if (!this.silenceTimeout && this.mediaRecorder.state !== 'inactive') {
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
      if (this.isSilence && this.mediaRecorder.state !== 'recording') {
        this.mediaRecorder.start();
        this.isSilence = false;
      }
      if (!this.hasSoundStarted) {
        this.hasSoundStarted = true;
      }
    }

    requestAnimationFrame(() => this.checkForSilence());
  }

  private computeVolume(amplitudeArray: Float32Array): number {
    const values = amplitudeArray.reduce(
      (sum, value) => sum + value * value,
      0
    );
    const average = Math.sqrt(values / amplitudeArray.length); // calculate rms
    const volume = 20 * Math.log10(average); // convert to dB
    return volume;
  }
}

export default SilenceAwareRecorder;
