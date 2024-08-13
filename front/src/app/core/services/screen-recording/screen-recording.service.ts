import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScreenRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = signal<boolean>(false);

  // Observable to notify when the recording is completed
  public readonly recordedBlob = signal<Blob | null>(null);

  public startRecording = async (startDelayInMs: number = 0): Promise<void> => {
    this.recordedChunks = [];

    try {
      const supportedConstraints: MediaTrackSupportedConstraints =
        navigator.mediaDevices.getSupportedConstraints();

      const supportsDisplaySurface: boolean =
        supportedConstraints.hasOwnProperty('displaySurface');
      // Request screen access
      const stream: MediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: supportsDisplaySurface
          ? {
              displaySurface: 'browser',
            }
          : true,
        audio: true, // Optional, depending on your needs
      });

      // Create a MediaRecorder instance
      this.mediaRecorder = new MediaRecorder(stream);

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
    } catch (error) {
      console.error('Error accessing screen stream for recording: ', error);

      this.isRecording.update(() => false);
    }
  };

  public stopRecording = (): void => {
    if (!this.isRecorderReady()) {
      return;
    }

    this.mediaRecorder!.stop();
    this.isRecording.update(() => false);
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
