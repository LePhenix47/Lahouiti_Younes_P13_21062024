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

  /**
   * Stops the volume measurement by canceling the animation frame if it exists.
   *
   */
  public stopVolumeMeasurement = (): void => {
    if (!this.animationFrameId) {
      console.error('No animation frame to cancel');

      return;
    }

    cancelAnimationFrame(this.animationFrameId);

    if (!this.microphoneStream) {
      console.error('No microphone stream provided to stop tracks from');

      return;
    }

    this.microphoneStream?.getAudioTracks();

    for (const audioTrack of this.microphoneStream!.getAudioTracks()) {
      audioTrack.stop();
    }
  };

  /**
   * Sets the HTMLInputElement to be used as the volume meter element.
   *
   * @param {HTMLInputElement} element - The HTMLInputElement to be used as the volume meter element.
   * @return {void}
   */
  public setVolumeMeterElement = (
    element: HTMLInputElement | HTMLProgressElement
  ): void => {
    this.volumeMeterEl = element;
  };

  /**
   * Sets the microphone stream to be used for volume measurement.
   *
   * @param {MediaStream} audioStream - The microphone stream to be used.
   * @return {void}
   */
  public setMicrophoneStream = (audioStream: MediaStream): void => {
    this.microphoneStream = audioStream;
  };

  /**
   * Starts the volume measurement by creating an `AudioContext`,
   * connecting the microphone stream to an `AnalyserNode`, and
   * scheduling an animation frame to update the volume meter.
   *
   * @return {void}
   */
  public startVolumeMeasurement = (): void => {
    if (!this.microphoneStream) {
      console.warn('No microphone stream available');
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
  };

  /**
   * Creates a new `AudioContext` instance.
   *
   * @return {AudioContext} The newly created `AudioContext` instance.
   */
  private createAudioContext = (): AudioContext => {
    return new (AudioContext || (window as any).webkitAudioContext)();
  };

  /**
   * Creates a `MediaStreamAudioSourceNode` from the given `MediaStream`.
   *
   * @param {MediaStream} stream - The `MediaStream` to create a
   * `MediaStreamAudioSourceNode` from.
   * @return {MediaStreamAudioSourceNode} The newly created
   * `MediaStreamAudioSourceNode`.
   */
  private createMediaStreamSource = (
    stream: MediaStream
  ): MediaStreamAudioSourceNode => {
    if (!this.audioContext) {
      throw new Error(
        'AudioContext not initialized, can not create MediaStreamSourceNode.'
      );
    }

    return this.audioContext.createMediaStreamSource(stream);
  };

  /**
   * Creates a new `AnalyserNode` instance.
   *
   * @return {AnalyserNode} The newly created `AnalyserNode` instance.
   */
  private createAnalyserNode = (): AnalyserNode => {
    if (!this.audioContext) {
      throw new Error(
        'AudioContext not initialized, can not create AnalyserNode.'
      );
    }

    return this.audioContext.createAnalyser();
  };

  /**
   * Connects the given `MediaStreamAudioSourceNode` to the specified
   * `AnalyserNode`.
   *
   * @param {MediaStreamAudioSourceNode} sourceNode - The source node to connect.
   * @param {AnalyserNode} analyserNode - The analyser node to connect to.
   */
  private connectAudioNodes = (
    sourceNode: MediaStreamAudioSourceNode,
    analyserNode: AnalyserNode
  ): void => {
    sourceNode.connect(analyserNode);
  };

  /**
   * Starts the volume update process with the provided pcmData.
   *
   * @param {Float32Array} pcmData - The pcmData to update the volume meter with.
   */
  private startVolumeUpdate = (pcmData: Float32Array): void => {
    /**
     * Executes the `onFrame` function, updating the volume meter with the provided pcmData
     * and scheduling the next animation frame.
     */
    const onFrame = () => {
      this.updateVolumeMeter(pcmData);
      this.animationFrameId = requestAnimationFrame(onFrame);
    };
    this.animationFrameId = requestAnimationFrame(onFrame);
  };

  /**
   * Updates the volume meter with the provided `pcmData`.
   *
   * PCM (Pulse Code Modulation) is a method of encoding an analogue
   * signal so that it can be transmitted or stored in a digital format.
   * In this case, the `pcmData` is an array of floating point numbers,
   * representing the current waveform of the audio signal being
   * measured by the volume meter.
   *
   * @param {Float32Array} pcmData - The array of floating point numbers
   * representing the current waveform of the audio signal.
   */
  private updateVolumeMeter = (pcmData: Float32Array): void => {
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
  };

  /**
   * Sets the value of the progress bar element.
   *
   * @param {number} value - The value to set the progress bar to.
   * @return {void} This function does not return anything.
   */
  private setProgressBarValue = (value: number): void => {
    if (!this.volumeMeterEl) {
      return;
    }

    this.volumeMeterEl.value = value;
  };
}
