import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VolumeMeterService {
  private volumeMeterEl: HTMLInputElement | HTMLProgressElement | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private microphoneStream: MediaStream | null = null;

  private animationFrameId: number | null = null;

  constructor() {}
  /**
   * Stops the volume measurement by canceling the animation frame if it exists.
   *
   */
  public stopVolumeMeasurement(): void {
    if (!this.animationFrameId) {
      return;
    }

    cancelAnimationFrame(this.animationFrameId);
  }

  /**
   * Sets the HTMLInputElement to be used as the volume meter element.
   *
   * @param {HTMLInputElement} element - The HTMLInputElement to be used as the volume meter element.
   * @return {void}
   */
  public setVolumeMeterElement(element: HTMLInputElement): void {
    this.volumeMeterEl = element;
  }

  // Setter method to set the microphone stream
  public setMicrophoneStream(audioStream: MediaStream): void {
    this.microphoneStream = audioStream;
  }

  public startVolumeMeasurement(): void {
    if (!this.microphoneStream) {
      return;
    } // Exit if no valid stream is returned

    this.audioContext = this.createAudioContext();

    const mediaStreamAudioSourceNode: MediaStreamAudioSourceNode =
      this.createMediaStreamSource(this.microphoneStream);
    this.analyserNode = this.createAnalyserNode();

    this.connectAudioNodes(mediaStreamAudioSourceNode, this.analyserNode);

    this.analyserNode.fftSize = 2 ** 8;
    const pcmData = new Float32Array(this.analyserNode.fftSize);
    this.startVolumeUpdate(pcmData);
  }

  private createAudioContext(): AudioContext {
    return new (AudioContext || (window as any).webkitAudioContext)();
  }

  private createMediaStreamSource(
    stream: MediaStream
  ): MediaStreamAudioSourceNode {
    if (!this.audioContext) {
      throw new Error(
        'AudioContext not initialized, can not create MediaStreamSourceNode.'
      );
    }

    return this.audioContext.createMediaStreamSource(stream);
  }

  private createAnalyserNode(): AnalyserNode {
    if (!this.audioContext) {
      throw new Error(
        'AudioContext not initialized, can not create AnalyserNode.'
      );
    }

    return this.audioContext.createAnalyser();
  }

  private connectAudioNodes(
    sourceNode: MediaStreamAudioSourceNode,
    analyserNode: AnalyserNode
  ): void {
    sourceNode.connect(analyserNode);
  }

  private startVolumeUpdate(pcmData: Float32Array): void {
    const onFrame = () => {
      this.updateVolumeMeter(pcmData);
      this.animationFrameId = requestAnimationFrame(onFrame);
    };
    this.animationFrameId = requestAnimationFrame(onFrame);
  }

  private updateVolumeMeter(pcmData: Float32Array): void {
    if (!this.analyserNode || !this.volumeMeterEl) {
      return;
    }

    this.analyserNode.getFloatTimeDomainData(pcmData);
    let sumSquares: number = 0.0;

    for (const amplitude of pcmData) {
      sumSquares += amplitude ** 2;
    }

    // * The total amplitude is calculated as the root mean square (RMS) of the audio signal's amplitudes
    const calculatedAmplitude: number = Math.sqrt(sumSquares / pcmData.length);

    this.setProgressBarValue(calculatedAmplitude);
  }

  private setProgressBarValue(value: number): void {
    if (!this.volumeMeterEl) {
      return;
    }

    this.volumeMeterEl.value = value;
  }
}
