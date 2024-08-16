import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ScreenRecordingService {
  public screenStream: MediaStream | null = null;
  public remotePeerStream: MediaStream | null = null;

  public mediaRecorder: MediaRecorder | null = null;

  private recordedChunks: Blob[] = [];
  private downloadElement: HTMLAnchorElement | null = null;

  public readonly isRecording = signal<boolean>(false);
  public readonly recordedBlob = signal<Blob | null>(null);

  public setRemoteAudioStream = (
    stream: MediaStream | null,
    stopTracks?: boolean
  ): void => {
    if (!stream && this.remotePeerStream && stopTracks) {
      for (const track of this.remotePeerStream.getTracks()) {
        track.stop();
      }
    }

    this.remotePeerStream = stream;
  };

  private onScreenStreamEnd: (...args: any) => any = (): any => {};

  public setOnScreenStreamEnd = (callback: (...args: any) => any) => {
    this.onScreenStreamEnd = callback;
  };

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
    audioDeviceId?: string
  ): Promise<MediaStream | null> => {
    this.resetRecording();

    try {
      const supportedConstraints: MediaTrackSupportedConstraints =
        navigator.mediaDevices.getSupportedConstraints();

      const supportsDisplaySurface: boolean =
        supportedConstraints.hasOwnProperty('displaySurface');
      // Request screen access
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: supportsDisplaySurface
          ? {
              displaySurface: 'browser',
            }
          : true,
        audio: true, // ? Optional, depending on your needs
      });

      const userAudioStream: MediaStream =
        await navigator.mediaDevices.getUserMedia({
          audio: Boolean(audioDeviceId) ? { deviceId: audioDeviceId } : true,
        });

      const combinedTracks: MediaStreamTrack[] = [
        ...this.screenStream.getTracks(),
        ...userAudioStream.getTracks(),
      ];

      if (this.remotePeerStream) {
        combinedTracks.push(...this.remotePeerStream.getAudioTracks());
      }

      const mixedStreams = new MediaStream(combinedTracks);
      // Create a MediaRecorder instance
      this.mediaRecorder = new MediaRecorder(mixedStreams);

      // Handle data available event
      this.mediaRecorder.addEventListener(
        'dataavailable',
        this.onDataAvailable
      );

      const screenTrack: MediaStreamTrack = mixedStreams.getVideoTracks()[0];
      screenTrack.addEventListener('ended', this.stopRecording);
      // * Start recording

      this.mediaRecorder.start();
      this.isRecording.update(() => true);

      console.log(
        'Screen recording started !',
        mixedStreams,
        this.mediaRecorder
      );

      return mixedStreams;
    } catch (error) {
      console.error('Error accessing screen stream for recording: ', error);

      this.isRecording.update(() => false);

      return null;
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

  public stopRecording = (): void => {
    if (!this.isRecorderReady()) {
      console.error('No recorder available to stop recording');
      return;
    }

    this.mediaRecorder!.addEventListener('stop', () => {
      this.onMediaRecordingStop();
    });
    this.mediaRecorder!.stop(); // Stop the recorder
    this.stopStreamTracks(); // Stop the stream tracks
  };

  private onMediaRecordingStop = (): void => {
    console.log('Media recording stopped.');

    // Ensure we have recorded chunks before creating a Blob
    if (this.recordedChunks.length > 0) {
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      this.recordedBlob.update(() => blob);

      console.log('Blob created successfully.', { blob }, this.recordedBlob());
    } else {
      console.warn('No recorded chunks available for blob creation.');
    }

    this.onScreenStreamEnd();

    this.isRecording.update(() => false);

    this.mediaRecorder!.removeEventListener('stop', () => {
      this.onMediaRecordingStop();
    });

    this.resetRecording(); // Reset the service state
  };

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

  private stopStreamTracks = (): void => {
    if (!this.mediaRecorder?.stream) {
      console.error('No stream to stop tracks from');

      return;
    }

    const tracks: MediaStreamTrack[] = this.mediaRecorder.stream.getTracks();
    for (const track of tracks) {
      track.stop();
    }
  };

  private resetRecording = (): void => {
    this.recordedChunks = [];
    this.mediaRecorder = null;
  };
}
