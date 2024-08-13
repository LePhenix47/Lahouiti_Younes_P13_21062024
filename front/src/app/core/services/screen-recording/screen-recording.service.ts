import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScreenRecordingService {
  public mediaRecorder: MediaRecorder | null = null;

  private recordedChunks: Blob[] = [];
  private downloadElement: HTMLAnchorElement | null = null;

  public readonly isRecording = signal<boolean>(false);
  public readonly recordedBlob = signal<Blob | null>(null);

  public setDownloadElement = (element: HTMLAnchorElement): void => {
    this.downloadElement = element;
  };

  public setDownloadLink = (): void => {
    if (!this.recordedBlob()) {
      console.error('No blob to download');

      return;
    }

    if (!this.downloadElement) {
      console.error('No download element provided');

      return;
    }

    const objectUrl: string = URL.createObjectURL(this.recordedBlob()!);

    this.downloadElement.download = 'screen-recording.webm';
    this.downloadElement.href = objectUrl;
  };

  public startRecording = async (
    startDelayInMs: number = 0,
    audioDeviceId?: string
  ): Promise<MediaStream | null> => {
    this.recordedChunks = [];

    try {
      if (startDelayInMs < 0) {
        throw new Error('startDelayInMs must be greater than or equal to 0');
      }

      const supportedConstraints: MediaTrackSupportedConstraints =
        navigator.mediaDevices.getSupportedConstraints();

      const supportsDisplaySurface: boolean =
        supportedConstraints.hasOwnProperty('displaySurface');
      // Request screen access
      const screenStream: MediaStream =
        await navigator.mediaDevices.getDisplayMedia({
          video: supportsDisplaySurface
            ? {
                displaySurface: 'browser',
              }
            : true,
          audio: true, // Optional, depending on your needs
        });

      const userAudioStream: MediaStream =
        await navigator.mediaDevices.getUserMedia({
          audio: Boolean(audioDeviceId) ? { deviceId: audioDeviceId } : true,
        });

      const combinedTracks: MediaStreamTrack[] = [
        ...screenStream.getTracks(),
        ...userAudioStream.getTracks(),
      ];

      const mixedStreams = new MediaStream(combinedTracks);
      // Create a MediaRecorder instance
      this.mediaRecorder = new MediaRecorder(mixedStreams);

      // Handle data available event
      this.mediaRecorder.addEventListener(
        'dataavailable',
        this.onDataAvailable
      );

      // Handle stop event
      this.mediaRecorder.addEventListener('stop', this.onMediaRecordingStop);

      // * Start recording

      this.mediaRecorder.start(startDelayInMs);
      this.isRecording.update(() => true);

      return mixedStreams;
    } catch (error) {
      console.error('Error accessing screen stream for recording: ', error);

      this.isRecording.update(() => false);

      return null;
    }
  };

  public stopRecording = (): void => {
    if (!this.isRecorderReady()) {
      return;
    }

    this.mediaRecorder!.stop();

    const tracks: MediaStreamTrack[] = this.mediaRecorder!.stream.getTracks();
    for (const track of tracks) {
      track.stop();
    }
  };

  public pauseRecording = (): void => {
    if (!this.isRecorderReady()) {
      return;
    }

    this.mediaRecorder!.pause();
  };

  public resumeRecording = (): void => {
    if (!this.isRecorderReady()) {
      return;
    }

    this.mediaRecorder!.resume();
  };

  private onDataAvailable = (event: BlobEvent): void => {
    const hasNoChunks: boolean = !(event.data.size > 0);
    if (hasNoChunks) {
      return;
    }

    this.recordedChunks.push(event.data);
  };

  private onMediaRecordingStop = (event: Event): void => {
    // Create a Blob from the recorded chunks
    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });

    this.isRecording.update(() => false);
    this.recordedBlob.update(() => blob);
    this.resetRecording();
  };

  /**
   * Checks if the media recorder is available and if recording is in progress.
   *
   * @return {boolean} True if the media recorder is available and recording is in progress, false otherwise.
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

  private resetRecording = (): void => {
    this.recordedChunks = [];
    this.mediaRecorder = null;
  };
}
