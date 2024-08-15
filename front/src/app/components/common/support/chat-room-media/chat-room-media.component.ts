import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  ViewChild,
} from '@angular/core';
import { ScreenRecordingService } from '@core/services/screen-recording/screen-recording.service';
import { ChatWebRtcService } from '@core/services/video-chat/chat-webrtc.service';
import { VolumeMeterService } from '@core/services/volume-meter/volume-meter.service';
import {
  DeviceInfo,
  Room,
} from '@core/types/videoconference/videoconference.types';
import { createDeviceList } from '@core/utils/videoconference/videoconference.utils';
import { Socket } from 'socket.io-client';

@Component({
  selector: 'app-chat-room-media',
  standalone: true,
  imports: [],
  templateUrl: './chat-room-media.component.html',
  styleUrl: './chat-room-media.component.scss',
})
export class ChatRoomMediaComponent {
  // * Refs for the video elements
  @ViewChild('ownWebCamVideoRef')
  ownWebCamVideoRef: ElementRef<HTMLVideoElement> | null = null;

  @ViewChild('remoteWebCamVideoRef')
  remoteWebCamVideoRef: ElementRef<HTMLVideoElement> | null = null;

  @ViewChild('ownAudioVolumeIndicatorRef')
  ownAudioVolumeIndicatorRef: ElementRef<HTMLProgressElement> | null = null;

  @ViewChild('remotePeerAudioVolumeIndicatorRef')
  remotePeerAudioVolumeIndicatorRef: ElementRef<HTMLProgressElement> | null =
    null;

  @ViewChild('downloadRecordingLinkRef')
  downloadRecordingLinkRef: ElementRef<HTMLAnchorElement> | null = null;

  @ViewChild('videoRecordingElementRef')
  videoRecordingElementRef: ElementRef<HTMLVideoElement> | null = null;

  /**
   * The Stomp client for the WebSocket connection.
   */
  public readonly socketIO = input.required<Socket | null>();

  /**
   * An array of user names in the chat.
   */
  public readonly usersList = input.required<string[]>();

  /**
   * The username of the current user.
   */
  public readonly ownUsername = input.required<string>();

  // * Services
  private readonly chatWebRtcService = inject(ChatWebRtcService);
  private readonly screenRecordingService = inject(ScreenRecordingService);

  private ownVolumeAnalyzerService: VolumeMeterService | null = null;
  private remoteVolumeAnalyzerService: VolumeMeterService | null = null;

  // * Local stream state
  public readonly showWebcam = signal<boolean>(false);
  public readonly openMicrophone = signal<boolean>(false);
  public readonly showScreenCast = signal<boolean>(false);

  public readonly enumeratedDevicesList = signal<MediaDeviceInfo[]>([]);

  // Filter for video input devices
  public readonly videoInputsList = computed<DeviceInfo[]>(() => {
    return createDeviceList(this.enumeratedDevicesList(), 'videoinput');
  });

  public readonly audioInputsList = computed<DeviceInfo[]>(() => {
    return createDeviceList(this.enumeratedDevicesList(), 'audioinput');
  });

  // Filter for audio output devices
  public readonly audioOutputsList = computed<DeviceInfo[]>(() => {
    return createDeviceList(this.enumeratedDevicesList(), 'audiooutput');
  });

  public readonly selectedVideoInputDeviceId = signal<string | null>(null);
  public readonly selectedAudioInputDeviceId = signal<string | null>(null);

  public readonly hasEnabledWebcamForWebRTC = signal<boolean>(false);
  public readonly hasEnabledMicrophoneForWebRTC = signal<boolean>(false);

  public readonly localPeerHasSharedLocalMedia = computed<boolean>(() => {
    const hasSharedLocalFeed: boolean =
      this.showWebcam() || this.openMicrophone();

    if (this.currentRoom() && !this.webRtcSessionStarted) {
      this.chatWebRtcService.notifyRemotePeerOfLocalMediaShare({
        video: this.showWebcam(),
        audio: this.openMicrophone(),
      });
    }

    return hasSharedLocalFeed;
  });

  // * PiP state
  public readonly isPiPToggleEnabledOnTabSwitch = signal<boolean>(false);

  // * WebRTC state
  public webRtcSessionStarted: boolean = false;
  public isReceiver: boolean = false;
  public otherPeerUserName: string | null = null;
  public isRemotePeerMediaActive: boolean = false;

  public readonly hasRemotePeerSharedWebCam = signal<boolean>(false);
  public readonly hasRemotePeerSharedMicrophone = signal<boolean>(false);
  public readonly illegalMediaMismatch = computed<boolean>(() => {
    // TODO: Add some logic here to check if there's an illegal media mismatch (e.g. video - audio or audio - video)
    return false;
  });

  public readonly isLoadingLocalMedia = signal<boolean>(false);
  public readonly isLoadingRemoteMedia = signal<boolean>(false);

  public readonly hasPiPModeAvailable = signal<boolean>(false);
  public readonly hasWebcamPermissionDenied = signal<boolean>(false);
  public readonly hasMicrophonePermissionDenied = signal<boolean>(false);
  public readonly hasCanceledScreenCast = signal<boolean>(false);

  // * Screen recording states
  public readonly isRecording = computed<boolean>(() => {
    return this.screenRecordingService.isRecording();
  });

  public readonly screenRecordingBlobs = signal<Blob[]>([]);
  public readonly screenRecordingObjectUrls = computed<string[]>(() => {
    console.log('Blobs array', this.screenRecordingBlobs());

    return this.screenRecordingBlobs()
      .map((blob: Blob) => {
        return URL.createObjectURL(blob);
      })
      .reverse();
  });

  // * Room states
  public readonly roomsList = signal<Room[]>([]);
  public readonly currentRoom = signal<string | null>(null);

  public roomErrorMessage: string | null = null;

  public signalEffect = effect(() => {
    console.log(
      'effect',
      this.localPeerHasSharedLocalMedia(),
      'remote:',
      this.hasRemotePeerSharedWebCam(),
      this.hasRemotePeerSharedMicrophone()
    );
  });

  // * Methods
  async ngOnInit() {
    console.group('ngOnInit()');
    this.getInitialDevicePermissions();

    this.ownVolumeAnalyzerService = new VolumeMeterService();
    this.remoteVolumeAnalyzerService = new VolumeMeterService();

    this.listenToDeviceChanges();
    await this.populateEnumeratedDevices();

    this.chatWebRtcService.setSocketIO(this.socketIO()!);
    this.chatWebRtcService.addRoomSocketEventListeners();

    this.setWebRtcServiceClassCallbacks();
    this.setScreenRecorderClassCallbacks();

    this.hasPiPModeAvailable.update(() => document.pictureInPictureEnabled);
    if (this.hasPiPModeAvailable()) {
      document.addEventListener('visibilitychange', this.togglePiPVideoElement);
    }

    this.roomsList.update(() => {
      return [...this.chatWebRtcService.getRoomList()];
    });

    this.socketIO()!.on(
      'wrtc-test',
      (data: { roomName: string; message: string }) => {
        console.log('wrtc-test', { data });
      }
    );
    console.groupEnd();
  }

  ngAfterViewInit(): void {
    console.group('ngAfterViewInit()');
    this.setWebRtcVideoElements();
    this.setVolumeMeterServiceElements();
    console.groupEnd();
  }

  ngOnDestroy() {
    this.ownVolumeAnalyzerService!.stopVolumeMeasurement();
    this.remoteVolumeAnalyzerService!.stopVolumeMeasurement();

    this.disconnectFromWebRtcSession();

    if (this.hasPiPModeAvailable()) {
      document.removeEventListener(
        'visibilitychange',
        this.togglePiPVideoElement
      );
    }

    this.chatWebRtcService.removeWebRtcSocketEventListeners();

    if (this.isReceiver) {
      this.disconnectFromRoom();
    } else {
      this.deleteRoom();
    }
  }

  private updateWebRTCDevicesAuthorizations = (): void => {
    this.hasEnabledWebcamForWebRTC.update(() => this.showWebcam());
    this.hasEnabledMicrophoneForWebRTC.update(() => this.openMicrophone());
  };

  private setVolumeMeterServiceElements = (): void => {
    const ownProgressElement: HTMLProgressElement =
      this.ownAudioVolumeIndicatorRef!.nativeElement;

    console.log('ownProgressElement', ownProgressElement);

    this.ownVolumeAnalyzerService!.setVolumeMeterElement(ownProgressElement);

    const remoteProgressElement: HTMLProgressElement =
      this.remotePeerAudioVolumeIndicatorRef!.nativeElement;

    this.remoteVolumeAnalyzerService!.setVolumeMeterElement(
      remoteProgressElement
    );

    console.log(
      this.ownVolumeAnalyzerService,
      this.remoteVolumeAnalyzerService
    );
  };

  private disconnectFromWebRtcSession = (): void => {
    if (!this.webRtcSessionStarted) {
      return;
    }

    this.chatWebRtcService.endWebRTCSession();
    this.resetWebRTCState();
    this.resetMediaCheckboxes();

    this.resetVolumeBars();
    console.log(
      '%cdisconnectFromWebRtcSession',
      'background: #222; color: #bada55'
    );
  };

  private resetVolumeBars = (): void => {
    this.ownVolumeAnalyzerService!.stopVolumeMeasurement();
    this.remoteVolumeAnalyzerService!.stopVolumeMeasurement();
  };

  private setWebRtcServiceClassCallbacks = (): void => {
    this.chatWebRtcService.setOnRoomListUpdateCallback(this.updateRoomsList);
    this.chatWebRtcService.setOnRoomCreatedCallback(this.roomCreatedCallback);
    this.chatWebRtcService.setOnRoomErrorCallback(this.showRoomError);
    this.chatWebRtcService.setOnRoomJoinedCallback(this.roomJoinedCallback);
    this.chatWebRtcService.setOnRoomDeletedCallback(this.roomDeletedCallback);
    this.chatWebRtcService.setOnReceiveEnabledLocalMediaCallback(
      this.remotePeerHasSharedLocalMediaCallback
    );

    // this.chatWebRtcService.setOnRoomLeftCallback();

    this.chatWebRtcService.setOnTrackAddedCallback(
      this.setWebRtcSessionStarted
    );

    this.chatWebRtcService.setOnScreenShareEndedCallback(this.onScreenShareEnd);
  };

  private setScreenRecorderClassCallbacks = (): void => {
    this.screenRecordingService.setOnScreenStreamEnd(
      this.updateVideoRecordingList
    );
  };

  private setWebRtcSessionStarted = (event: RTCTrackEvent): void => {
    this.webRtcSessionStarted = true;

    const remoteStream: MediaStream = event.streams[0];

    this.updateWebRTCDevicesAuthorizations();

    // Check if the remote stream contains any audio tracks
    const remoteAudioTracks: MediaStreamTrack[] = remoteStream.getAudioTracks();

    // Check if the remote stream contains any audio tracks
    const remoteVideoTracks: MediaStreamTrack[] = remoteStream.getVideoTracks();

    // TODO: Add logic to hide the video element if there is no video track and dB bar if there is no audio track

    this.hasRemotePeerSharedWebCam.update(() => {
      return remoteVideoTracks.length > 0;
    });
    this.hasRemotePeerSharedMicrophone.update(() => {
      return remoteAudioTracks.length > 0;
    });

    if (!this.hasRemotePeerSharedMicrophone()) {
      console.warn(
        'No audio tracks in remote stream, skipping volume measurement'
      );

      return;
    }
    this.remoteVolumeAnalyzerService!.setMicrophoneStream(remoteStream);

    this.remoteVolumeAnalyzerService!.startVolumeMeasurement();
  };

  private showRoomError = (errorMessage: string): void => {
    this.roomErrorMessage = errorMessage;
  };

  private resetRoomErrorMessage = (): void => {
    this.roomErrorMessage = '';
  };

  private listenToDeviceChanges = (): void => {
    navigator.mediaDevices.addEventListener(
      'devicechange',
      this.populateEnumeratedDevices
    );
  };

  private populateEnumeratedDevices = async (): Promise<void> => {
    const devices: MediaDeviceInfo[] =
      await navigator.mediaDevices.enumerateDevices();

    this.enumeratedDevicesList.update(() => {
      return devices;
    });
  };

  private resetWebRTCState = (): void => {
    this.isReceiver = false;
    this.otherPeerUserName = null;
    this.isRemotePeerMediaActive = false;
    this.webRtcSessionStarted = false;

    this.hasRemotePeerSharedWebCam.update(() => false);
    this.hasRemotePeerSharedMicrophone.update(() => false);

    this.onScreenShareEnd();

    const remoteVideoElement: HTMLVideoElement =
      this.remoteWebCamVideoRef!.nativeElement;

    this.setVideoElementStream(remoteVideoElement, null);
  };

  private resetMediaCheckboxes = (): void => {
    this.showWebcam.update(() => false);

    this.openMicrophone.update(() => false);
  };

  private getInitialDevicePermissions = async (): Promise<void> => {
    const cameraPermissionResult: PermissionStatus =
      await navigator.permissions.query({
        // @ts-ignore TS is drunk
        name: 'camera',
      });

    const microphonePermissionResult: PermissionStatus =
      await navigator.permissions.query({
        // @ts-ignore TS is drunk
        name: 'microphone',
      });

    this.hasWebcamPermissionDenied.update(() => {
      return cameraPermissionResult.state === 'denied';
    });

    this.hasMicrophonePermissionDenied.update(() => {
      return microphonePermissionResult.state === 'denied';
    });
  };

  private remotePeerHasSharedLocalMediaCallback = ({
    video,
    audio,
  }: {
    video: boolean;
    audio: boolean;
  }) => {
    console.log({ video, audio });

    this.isRemotePeerMediaActive = video || audio;

    this.hasRemotePeerSharedWebCam.update(() => video);
    this.hasRemotePeerSharedMicrophone.update(() => audio);
  };

  private setWebRtcVideoElements = (): void => {
    // * Local webcam, audio and screen cast
    this.chatWebRtcService.setLocalVideoElement(
      this.ownWebCamVideoRef!.nativeElement
    );

    // * Remote webcam, audio and screen cast
    this.chatWebRtcService.setRemoteVideoElement(
      this.remoteWebCamVideoRef!.nativeElement
    );
  };

  private roomCreatedCallback = (roomName: string): void => {
    this.currentRoom.update(() => {
      return roomName;
    });

    this.isReceiver = false;
  };

  private roomJoinedCallback = (
    roomName: string,
    otherPeerUserName: string
  ) => {
    this.currentRoom.update(() => {
      return roomName;
    });

    this.isReceiver = otherPeerUserName === this.ownUsername();

    this.otherPeerUserName = otherPeerUserName;

    this.chatWebRtcService.notifyRemotePeerOfLocalMediaShare({
      video: this.showWebcam(),
      audio: this.openMicrophone(),
    });
  };

  private roomDeletedCallback = (): void => {
    console.log('roomDeletedCallback');

    this.disconnectFromWebRtcSession();

    this.currentRoom.update(() => {
      return null;
    });

    this.resetWebRTCState();
  };

  private updateRoomsList = (rooms: Room[]): void => {
    this.roomsList.update(() => {
      return rooms;
    });
  };

  public createRoom = (): void => {
    if (this.currentRoom()) {
      console.warn(
        `User already ${
          this.currentRoom() === this.ownUsername() ? 'created' : 'joined'
        } a room`
      );

      return;
    }

    this.chatWebRtcService.createRoom(this.ownUsername());

    this.chatWebRtcService.initializePeerConnection();

    // ? See roomCreatedCallback for the rest (async callback)
  };

  public deleteRoom = (): void => {
    this.chatWebRtcService.deleteRoom(this.ownUsername());
  };

  public connectToRoom = (roomName: string): void => {
    this.chatWebRtcService.initializePeerConnection();
    this.chatWebRtcService.joinRoom(roomName);

    this.setWebRtcVideoElements();

    // ? See roomJoinedCallback for the rest (async callback)
  };

  public disconnectFromRoom = (): void => {
    this.chatWebRtcService.leaveRoom();

    this.disconnectFromWebRtcSession();

    this.currentRoom.update(() => {
      return null;
    });
  };

  public sendTestMessage = (): void => {
    this.socketIO()!.emit('wrtc-test', {
      roomName: this.currentRoom(),
      message: 'test',
    });
  };

  public initializeConnection = async (): Promise<void> => {
    this.chatWebRtcService.startWebRTCSession();

    this.webRtcSessionStarted = true;

    this.updateWebRTCDevicesAuthorizations();
  };

  public switchWebcamDevice = async (event: Event): Promise<void> => {
    console.log('switchWebcamDevice', event);
    const selectElement = event.target as HTMLSelectElement;

    this.selectedVideoInputDeviceId.update(() => {
      return selectElement.value;
    });

    try {
      const videoInputDeviceId: string = selectElement.value;

      const localStream = await this.chatWebRtcService.manageLocalStream(
        this.showWebcam(),
        this.openMicrophone(),
        this.selectedVideoInputDeviceId(),
        this.selectedAudioInputDeviceId()
      );

      console.log({ videoInputDeviceId, localStream });

      const webcamVideoElement: HTMLVideoElement =
        this.ownWebCamVideoRef!.nativeElement;

      if (!this.showScreenCast()) {
        this.setVideoElementStream(
          webcamVideoElement,
          this.chatWebRtcService.localStream
        );
      }

      if (this.openMicrophone()) {
        this.ownVolumeAnalyzerService!.startVolumeMeasurement();
      }
    } catch (error) {
      console.error(error);

      this.ownVolumeAnalyzerService!.stopVolumeMeasurement();
    }
  };

  public switchMicrophoneDevice = async (event: Event): Promise<void> => {
    console.log('switchMicrophoneDevice', event);
    const selectElement = event.target as HTMLSelectElement;

    this.selectedAudioInputDeviceId.update(() => {
      return selectElement.value;
    });

    try {
      const audioInputDeviceId: string = selectElement.value;

      const localStream: MediaStream | null =
        await this.chatWebRtcService.manageLocalStream(
          this.showWebcam(),
          this.openMicrophone(),
          this.selectedVideoInputDeviceId(),
          this.selectedAudioInputDeviceId()
        );

      console.log({ audioInputDeviceId, localStream });

      if (!localStream) {
        console.warn('No local stream available');

        return;
      }

      const webcamVideoElement: HTMLVideoElement =
        this.ownWebCamVideoRef!.nativeElement;

      if (!this.showScreenCast()) {
        this.setVideoElementStream(
          webcamVideoElement,
          this.chatWebRtcService.localStream
        );
      }

      this.ownVolumeAnalyzerService!.setMicrophoneStream(localStream);

      if (this.openMicrophone()) {
        this.ownVolumeAnalyzerService!.startVolumeMeasurement();
      }
    } catch (error) {
      console.error(error);

      this.ownVolumeAnalyzerService!.stopVolumeMeasurement();
    }
  };

  public switchSpeakerDevice = async (event: Event): Promise<void> => {
    const selectElement = event.target as HTMLSelectElement;
    const audioOutputDeviceId: string = selectElement.value;

    const remoteVideoElement: HTMLVideoElement =
      this.remoteWebCamVideoRef!.nativeElement;

    // @ts-ignore Angular compiler complains about not finding this method even though it exists
    await remoteVideoElement.setSinkId(audioOutputDeviceId);
  };

  private updateLocalStream = async (): Promise<void> => {
    try {
      const webcamVideoElement: HTMLVideoElement =
        this.ownWebCamVideoRef!.nativeElement;

      this.chatWebRtcService.resetLocalStream();

      if (!this.showWebcam() && !this.openMicrophone()) {
        this.setVideoElementStream(webcamVideoElement, null);
        return;
      }

      const localStream: MediaStream | null =
        await this.chatWebRtcService.manageLocalStream(
          this.showWebcam(),
          this.openMicrophone(),
          this.selectedVideoInputDeviceId(),
          this.selectedAudioInputDeviceId()
        );

      if (!localStream) {
        console.warn('No local stream available (updateLocalStream)');
        return;
      }

      if (!this.showScreenCast()) {
        this.setVideoElementStream(
          webcamVideoElement,
          this.chatWebRtcService.localStream
        );
      }

      this.ownVolumeAnalyzerService!.setMicrophoneStream(localStream);

      if (this.openMicrophone()) {
        this.ownVolumeAnalyzerService!.startVolumeMeasurement();
      }

      this.hasWebcamPermissionDenied.update(() => false);
      this.hasMicrophonePermissionDenied.update(() => false);
    } catch (error) {
      if (!(error instanceof Error)) {
        return;
      }

      // Check for permission-related errors
      const isNotPermissionRelated: boolean =
        !error.message.includes('NotAllowedError') &&
        error.name !== 'NotAllowedError';

      if (isNotPermissionRelated) {
        console.error(`An unexpected error occurred: ${error.message}`);
      }

      // Check if it was due to the webcam
      if (this.showWebcam()) {
        this.showWebcam.update(() => false);
        this.hasWebcamPermissionDenied.update(() => isNotPermissionRelated);
      }

      // Check if it was due to the microphone
      if (this.openMicrophone()) {
        this.openMicrophone.update(() => false);
        this.hasMicrophonePermissionDenied.update(() => isNotPermissionRelated);
      }

      this.ownVolumeAnalyzerService!.stopVolumeMeasurement();
    }
  };

  private updateScreenCastStream = async (): Promise<void> => {
    try {
      this.hasCanceledScreenCast.update(() => false);

      const webcamVideoElement: HTMLVideoElement =
        this.ownWebCamVideoRef!.nativeElement;

      if (!this.showScreenCast()) {
        webcamVideoElement.srcObject = null;
        return;
      }

      const screenStream: MediaStream | null =
        await this.chatWebRtcService.startScreenShare();

      this.setVideoElementStream(webcamVideoElement, screenStream!);
    } catch (error) {
      console.error('Error accessing screen stream.', error);

      this.showScreenCast.update(() => false);
      this.hasCanceledScreenCast.update(() => true);

      console.log(this.showScreenCast());
    }
  };

  private onScreenShareEnd = (event?: Event): void => {
    this.showScreenCast.update(() => false);

    const videoElement: HTMLVideoElement =
      this.ownWebCamVideoRef!.nativeElement;

    this.setVideoElementStream(
      videoElement,
      this.chatWebRtcService.localStream!
    );
  };

  private setVideoElementStream = (
    videoElement: HTMLVideoElement,
    stream: MediaStream | null
  ) => {
    videoElement.srcObject = stream;
  };

  public toggleInputDevicesOnWebRtc = (event: Event): void => {
    if (!this.webRtcSessionStarted) {
      console.error('WebRTC session has not started yet');

      return;
    }

    const input = event.currentTarget as HTMLInputElement;
    const [_, toggleType] = input.name.split(/\s/g);

    if (toggleType === 'webcam') {
      this.hasEnabledWebcamForWebRTC.update(() => input.checked);
    } else if (toggleType === 'microphone') {
      this.hasEnabledMicrophoneForWebRTC.update(() => input.checked);
    }

    this.chatWebRtcService.toggleLocalStream(
      this.hasEnabledWebcamForWebRTC(),
      this.hasEnabledMicrophoneForWebRTC()
    );
  };

  /**
   * Toggles the webcam state based on the given event.
   *
   * @param {Event} event - The event that triggered the toggle.
   */
  public toggleWebcam = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    this.showWebcam.update(() => input.checked);

    this.updateLocalStream();
  };

  /**
   * Toggles the audio input based on the given event.
   *
   * @param {Event} event - The event that triggered the toggle.
   */
  public toggleAudio = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    this.openMicrophone.update(() => input.checked);

    this.updateLocalStream();
  };

  /**
   * Toggles the screen cast state based on the given event.
   *
   * @param {Event} event - The event that triggered the toggle.
   */
  public toggleScreenCast = (event: Event): void => {
    this.showScreenCast.update(() => true);

    this.updateScreenCastStream();
  };

  public requestPictureInPicture = async (): Promise<void> => {
    try {
      if (!document.pictureInPictureEnabled) {
        throw new Error(
          'Cannot enable picture-in-picture: PiP mode is not supported by your browser'
        );
      }

      if (document.pictureInPictureElement) {
        throw new Error('Already in picture-in-picture mode');
      }

      const peerRemoteVideoElement: HTMLVideoElement =
        this.remoteWebCamVideoRef!.nativeElement;

      await peerRemoteVideoElement.requestPictureInPicture();
    } catch (error) {
      console.error('Error requesting picture-in-picture', error);

      this.isPiPToggleEnabledOnTabSwitch.update(() => false);
    }
  };

  public removePictureInPicture = async (): Promise<void> => {
    if (!document.pictureInPictureEnabled) {
      console.warn(
        'Cannot disable picture-in-picture: PiP is not supported by your browser'
      );

      return;
    }

    if (!document.pictureInPictureElement) {
      console.warn('Not in picture-in-picture mode');

      return;
    }

    await document.exitPictureInPicture();
  };

  public togglePiPOnTabSwitch = (event: Event): void => {
    const checkboxInput = event.target as HTMLInputElement;

    this.isPiPToggleEnabledOnTabSwitch.update((prev) => !prev);
  };

  private togglePiPVideoElement = (event: Event): void => {
    if (!this.isPiPToggleEnabledOnTabSwitch()) {
      return;
    }

    if (!this.webRtcSessionStarted) {
      return;
    }

    if (document.visibilityState === 'hidden') {
      return;
    }

    this.removePictureInPicture();
  };

  public startRecording = async (): Promise<void> => {
    const recordingStream = await this.screenRecordingService.startRecording(
      this.selectedAudioInputDeviceId()!
    );

    const videoRecordingElement: HTMLVideoElement =
      this.videoRecordingElementRef!.nativeElement;

    this.setVideoElementStream(videoRecordingElement, recordingStream);
  };

  public stopRecording = (): void => {
    this.screenRecordingService.stopRecording();
  };

  public removeBlobFromListByIndex = (index: number): void => {
    const specificBlob: Blob = this.screenRecordingBlobs()[index];

    if (!specificBlob) {
      console.error('No blob available to remove at index:', index);

      return;
    }

    const blobObjectUrl: string = this.screenRecordingObjectUrls()[index];

    this.screenRecordingBlobs.update((prev: Blob[]) => {
      prev.splice(index, 1);

      return [...prev];
    });

    URL.revokeObjectURL(blobObjectUrl);
  };

  private updateVideoRecordingList = (): void => {
    const screenRecordAsBlob: Blob | null =
      this.screenRecordingService.recordedBlob();
    if (!screenRecordAsBlob) {
      console.error('No blob available to download');

      return;
    }

    this.screenRecordingBlobs.update((prev: Blob[]) => {
      return [...prev, screenRecordAsBlob];
    });

    console.log(
      'Blob:',
      screenRecordAsBlob,
      'Blobs:',
      this.screenRecordingBlobs()
    );

    const downloadLinkElement: HTMLAnchorElement =
      this.downloadRecordingLinkRef!.nativeElement;

    this.screenRecordingService.setDownloadElement(downloadLinkElement);
    this.screenRecordingService.setDownloadLink();

    const videoRecordingElement: HTMLVideoElement =
      this.videoRecordingElementRef!.nativeElement;

    this.setVideoElementStream(videoRecordingElement, null);
  };
}
