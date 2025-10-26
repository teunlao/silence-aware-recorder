export interface CapabilitySnapshot {
  audioWorklet: boolean;
  sharedArrayBuffer: boolean;
  crossOriginIsolated: boolean;
  mediaRecorder: boolean;
}

export const snapshotCapabilities = (): CapabilitySnapshot => ({
  audioWorklet: typeof AudioWorkletNode !== 'undefined' && typeof AudioWorkletNode === 'function',
  sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
  crossOriginIsolated:
    typeof window !== 'undefined' && 'crossOriginIsolated' in window ? Boolean(window.crossOriginIsolated) : false,
  mediaRecorder: typeof MediaRecorder !== 'undefined',
});

export const supportsWorkletPipeline = (snapshot: CapabilitySnapshot): boolean =>
  snapshot.crossOriginIsolated && snapshot.sharedArrayBuffer && snapshot.audioWorklet;

export const supportsMediaRecorderPipeline = (snapshot: CapabilitySnapshot): boolean => snapshot.mediaRecorder;
