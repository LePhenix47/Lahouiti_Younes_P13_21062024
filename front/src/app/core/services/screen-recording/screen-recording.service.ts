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

  public mediaRecorder: MediaRecorder | null = null;

  private recordedChunks: Blob[] = [];

  public readonly isRecording = signal<boolean>(false);
  public readonly recordedBlob = signal<ScreenRecordBlob | null>(null);

  public startTime: number = NaN;
  public endTime: number = NaN;

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

  public setOnScreenStreamEnd = (callback: (...args: any) => any) => {
    this.onScreenStreamEnd = callback;
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
              displaySurface: 'window',
            }
          : true,
        audio: true,
      });

      this.ownMicrophoneStream = await navigator.mediaDevices.getUserMedia({
        audio: Boolean(audioDeviceId) ? { deviceId: audioDeviceId } : true,
      });

      const combinedTracks: MediaStreamTrack[] = [
        ...this.screenStream.getTracks(),
        ...this.ownMicrophoneStream.getAudioTracks(),
      ];
      if (this.remotePeerStream) {
        const audioTracks: MediaStreamTrack =
          this.remotePeerStream.getAudioTracks()[0];

        combinedTracks.push(audioTracks);
      }

      this.mixedStreams = new MediaStream(combinedTracks);

      console.log('mixedStreams:', this.mixedStreams);

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

    const tracks: MediaStreamTrack[] =
      this.mediaRecorder.stream.getVideoTracks();
    for (const track of tracks) {
      track.stop();
    }
  };

  private resetRecording = (): void => {
    this.recordedChunks = [];
    this.mediaRecorder = null;

    this.startTime = NaN;
    this.endTime = NaN;
  };

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

  private computeVideoSize = (blob: Blob): any => {};
}
