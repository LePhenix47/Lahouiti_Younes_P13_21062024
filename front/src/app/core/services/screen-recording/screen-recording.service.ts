import { Injectable, signal } from '@angular/core';
import { FormattedDuration } from '@core/types/helpers/time.types';
import { ScreenRecordBlob } from '@core/types/screen-recording/screen-recording.types';
import { formatTimeValues } from '@core/utils/numbers/time.utils';

@Injectable({
  providedIn: 'root',
})
export class ScreenRecordingService {
  public screenStream: MediaStream | null = null;
  public ownMicrophoneStream: MediaStream | null = null;
  public remotePeerStream: MediaStream | null = null;
  public mixedStreams: MediaStream | null = null;

  private audioContext: AudioContext | null = null;
  public mediaRecorder: MediaRecorder | null = null;

  private recordedChunks: Blob[] = [];

  public readonly isRecording = signal<boolean>(false);
  public readonly recordedBlob = signal<ScreenRecordBlob | null>(null);

  public startTime: number = NaN;
  public endTime: number = NaN;

  /**
   * Sets the remote audio stream, allowing it to be part of the recording.
   * If `stopTracks` is true, it stops the existing remote peer's audio track.
   * @param {MediaStream|null} stream - The new remote audio stream.
   * @param {boolean} [stopTracks=false] - Whether to stop the current remote audio track.
   */
  public setRemoteAudioStream = (
    stream: MediaStream | null,
    stopTracks?: boolean
  ): void => {
    if (!stream && this.remotePeerStream && stopTracks) {
      const remotePeerAudioTrack = this.remotePeerStream.getAudioTracks()?.[0];

      this.mixedStreams?.removeTrack(remotePeerAudioTrack);
    }

    if (!stream) {
      return;
    }

    const clonedStream: MediaStream = stream?.clone();
    this.remotePeerStream = clonedStream;
  };

  private onScreenStreamEnd: (...args: any) => any = (): any => {};

  /**
   * Sets the callback function to be executed when the screen stream ends.
   * @param {(...args: any) => any} [...args] - The callback function to execute when the screen stream ends.
   */
  public setOnScreenStreamEnd = (callback: (...args: any) => any) => {
    this.onScreenStreamEnd = callback;
  };

  /**
   * Starts the screen recording process, including audio from the screen, microphone, and remote peer.
   * If the audio context is not set up, it creates one.
   * @param {string} [audioDeviceId] - Optional device ID for the microphone.
   * @returns {Promise<MediaStream|null>} - The mixed media stream.
   * @throws Will throw an error if there is an issue accessing the screen stream.
   */
  public startRecording = async (
    audioDeviceId?: string
  ): Promise<MediaStream | null> => {
    this.resetRecordingState();

    try {
      const supportedConstraints: MediaTrackSupportedConstraints =
        navigator.mediaDevices.getSupportedConstraints();

      const supportsDisplaySurface: boolean =
        supportedConstraints.hasOwnProperty('displaySurface');
      // Request screen access
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: supportsDisplaySurface
          ? {
              displaySurface: 'window',
            }
          : true,
        audio: true,
      });

      this.ownMicrophoneStream = await navigator.mediaDevices.getUserMedia({
        audio: Boolean(audioDeviceId) ? { deviceId: audioDeviceId } : true,
      });

      // Combine audio tracks using a separate method
      const mixedAudioStream: MediaStream = this.getMergedAudioStreams();

      // Combine video and mixed audio into one stream
      this.mixedStreams = new MediaStream([
        ...this.screenStream.getVideoTracks(),
        ...mixedAudioStream.getAudioTracks(),
      ]);

      // Create a MediaRecorder instance
      this.mediaRecorder = new MediaRecorder(this.mixedStreams);

      // Handle data available event
      this.mediaRecorder.addEventListener(
        'dataavailable',
        this.onDataAvailable
      );

      const screenTrack: MediaStreamTrack =
        this.mixedStreams.getVideoTracks()[0];
      screenTrack.addEventListener('ended', this.stopRecording);
      // * Start recording

      this.mediaRecorder.start();
      this.isRecording.update(() => true);
      this.startTime = performance.now();

      console.log(
        'Screen recording started !',
        this.mixedStreams,
        this.mediaRecorder
      );

      return this.mixedStreams;
    } catch (error) {
      console.error('Error accessing screen stream for recording: ', error);

      this.isRecording.update(() => false);
      this.startTime = NaN;

      throw error;
    }
  };

  /**
   * Merges multiple audio streams (screen sound, own microphone, remote peer audio) into a single `MediaStream`.
   * This is necessary because `MediaRecorder` **can only handle *one* audio track at a time.**
   * @returns {MediaStream} - The merged audio `MediaStream`.
   */
  private getMergedAudioStreams = (): MediaStream => {
    // * Initialize AudioContext
    this.audioContext = new (AudioContext ||
      (window as any).webkitAudioContext)();

    // * Create a destination node to combine the audio
    const audioDestination: MediaStreamAudioDestinationNode =
      this.audioContext.createMediaStreamDestination();

    // * Create MediaStreamSource nodes for each audio stream & connect the audio sources to the destination node

    // @ts-ignore,
    // ? TS ain't smart enough to infer that getAudioTracks can be accessed
    // ? ONLY IF the stream is defined because we're using optional chaining (?.)
    if (this.screenStream?.getAudioTracks?.()?.length > 0) {
      const screenAudioSource: MediaStreamAudioSourceNode =
        this.audioContext.createMediaStreamSource(this.screenStream!);
      screenAudioSource.connect(audioDestination);
    }

    // @ts-ignore
    if (this.ownMicrophoneStream?.getAudioTracks?.()?.length > 0) {
      const micAudioSource: MediaStreamAudioSourceNode =
        this.audioContext.createMediaStreamSource(this.ownMicrophoneStream!);
      micAudioSource.connect(audioDestination);
    }

    // @ts-ignore
    if (this.remotePeerStream?.getAudioTracks?.()?.length > 0) {
      const remoteAudioSource: MediaStreamAudioSourceNode =
        this.audioContext.createMediaStreamSource(this.remotePeerStream!);

      remoteAudioSource.connect(audioDestination);
    }

    // Return the combined audio stream
    return audioDestination.stream;
  };

  /**
   * Stops the recording process, finalizes the media blob, and triggers any cleanup operations.
   */
  public stopRecording = (): void => {
    if (!this.isRecorderReady()) {
      console.error('No recorder available to stop recording');
      return;
    }

    this.endTime = performance.now();

    this.mediaRecorder!.addEventListener('stop', async () => {
      await this.onMediaRecordingStop();
    });
    this.mediaRecorder!.stop(); // Stop the recorder
    this.stopStreamTracks(); // Stop the stream tracks
  };

  /**
   * Handles the logic when the media recording stops.
   * This method finalizes the recorded media into a `Blob` and triggers the screen stream end callback.
   */
  private onMediaRecordingStop = async (): Promise<void> => {
    console.log('Media recording stopped.');

    // Ensure we have recorded chunks before creating a Blob
    if (this.recordedChunks.length > 0) {
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      const duration = this.computeDuration() as number;
      const { size } = blob;

      const objectUrl = URL.createObjectURL(blob);

      this.recordedBlob.update(() => {
        return {
          blob,
          duration,
          size,
          objectUrl,
        };
      });

      console.log('Blob created successfully.', { blob }, this.recordedBlob(), {
        duration,
      });
    } else {
      console.warn('No recorded chunks available for blob creation.');
    }

    this.onScreenStreamEnd();

    this.isRecording.update(() => false);

    this.mediaRecorder!.removeEventListener('stop', async () => {
      await this.onMediaRecordingStop();
    });

    this.resetRecordingState(); // Reset the service state
  };

  /**
   * Handles data availability events from the `MediaRecorder`, collecting the recorded data chunks.
   * @param {BlobEvent} event - The event containing the recorded data chunk.
   */
  private onDataAvailable = (event: BlobEvent): void => {
    const hasNoChunks: boolean = !(event.data?.size > 0);
    if (hasNoChunks) {
      console.warn(
        'No data chunks available to record',
        'recordedChunks',
        this.recordedChunks
      );

      return;
    }

    this.recordedChunks.push(event.data);
  };

  /**
   * Checks if the `MediaRecorder` is ready to stop recording, ensuring that recording is in progress.
   * @returns {boolean} - True if the recorder is ready, false otherwise.
   */
  private isRecorderReady = (): boolean => {
    if (!this.mediaRecorder) {
      console.error('Cannot operate, no recorder available');
      return false;
    }

    if (!this.isRecording) {
      console.error('Cannot operate, recording is not in progress');
      return false;
    }

    return true;
  };

  /**
   * Stops all tracks within the media stream to ensure they do not continue consuming resources thus avoiding memory leaks.
   */
  private stopStreamTracks = (): void => {
    if (!this.mediaRecorder?.stream) {
      console.error('No stream to stop tracks from');

      return;
    }

    const { stream } = this.mediaRecorder;

    const tracks: MediaStreamTrack[] = stream.getTracks();
    for (const track of tracks) {
      track.stop();
    }
  };

  /**
   * Resets the recording state, clearing out any existing data and resetting the recorder instance.
   */
  private resetRecordingState = (): void => {
    this.recordedChunks = [];
    this.mediaRecorder = null;

    this.startTime = NaN;
    this.endTime = NaN;
  };

  /**
   * Computes the duration of the recording session in seconds or formatted as an object.
   * @param {boolean} [format=false] - Whether to format the duration into an object with hours, minutes, and seconds.
   * @returns {FormattedDuration|number} - The duration of the recording.
   * @throws {TypeError} - If startTime or endTime is not a number.
   */
  private computeDuration = (
    format: boolean = false
  ): FormattedDuration | number => {
    if (Number.isNaN(this.startTime) || Number.isNaN(this.endTime)) {
      throw new TypeError(
        `startTime or endTime is not a number \n Start: ${this.startTime}, End: ${this.endTime}`
      );
    }

    const timeDifferenceInSeconds: number = Math.floor(
      (this.endTime - this.startTime) / 1_000
    );

    if (!format) {
      return timeDifferenceInSeconds;
    }

    const { hours, minutes, seconds } = formatTimeValues(
      timeDifferenceInSeconds
    );

    return { hours, minutes, seconds };
  };
}
