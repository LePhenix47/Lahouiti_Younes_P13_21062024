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
import { Title } from '@angular/platform-browser';
import { CollapsibleHeightComponent } from '@components/shared/collapsible-height/collapsible-height.component';
import { MediaDisplayModeService } from '@core/services/media-display-mode/media-display-mode.service';
import { ScreenRecordingService } from '@core/services/screen-recording/screen-recording.service';
import { ChatWebRtcService } from '@core/services/video-chat/chat-webrtc.service';
import { VolumeMeterService } from '@core/services/volume-meter/volume-meter.service';
import { ScreenRecordBlob } from '@core/types/screen-recording/screen-recording.types';
import {
  DeviceInfo,
  Room,
} from '@core/types/videoconference/videoconference.types';
import { formatTimeValues } from '@core/utils/numbers/time.utils';
import {
  checkDeviceListAvailability,
  createDeviceList,
} from '@core/utils/videoconference/videoconference.utils';
import { Socket } from 'socket.io-client';
import { MatIconModule } from '@angular/material/icon';
import {
  hasFrontAndRearCameras,
  isTouchDevice,
} from '@core/utils/mobile/mobile.utils';

@Component({
  selector: 'app-chat-room-media',
  standalone: true,
  imports: [CollapsibleHeightComponent, MatIconModule],
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
  private readonly titlePageService = inject(Title);
  private readonly chatWebRtcService = inject(ChatWebRtcService);
  private readonly screenRecordingService = inject(ScreenRecordingService);
  private readonly mediaDisplayModeService = inject(MediaDisplayModeService);

  // ? Since in Angular you cannot have independent service instances using inject(), we have to instantiate them manually
  private ownVolumeAnalyzerService: VolumeMeterService | null = null;
  private remoteVolumeAnalyzerService: VolumeMeterService | null = null;

  // * Local stream state
  public readonly showWebcam = signal<boolean>(false);
  public readonly openMicrophone = signal<boolean>(false);
  public readonly showScreenCast = signal<boolean>(false);

  public readonly canShareScreen = signal<boolean>(false);
  public readonly canRecordScreen = computed<boolean>(() => {
    return typeof MediaRecorder !== 'undefined' && this.canShareScreen();
  });
  public readonly canSwitchSpeakerDevice = signal<boolean>(false);

  // * Input-Output devices
  public readonly enumeratedDevicesList = signal<MediaDeviceInfo[]>([]);

  public readonly videoInputsList = computed<DeviceInfo[]>(() => {
    return createDeviceList(this.enumeratedDevicesList(), 'videoinput');
  });

  public readonly isTouchDeviceWithCameras = computed<boolean>(() => {
    const { hasFrontCamera, hasBackCamera } = hasFrontAndRearCameras(
      this.videoInputsList()
    );

    console.log(
      'Result of hasFrontAndRearCameras',
      hasFrontCamera,
      hasBackCamera
    );

    return (
      isTouchDevice() &&
      !this.hasNoVideoInputsInList() &&
      (hasFrontCamera || hasBackCamera)
    );
  });

  public readonly hasSelectedBackCamera = computed<boolean>(() => {
    const activeCamera: DeviceInfo | null =
      this.videoInputsList().find((device: DeviceInfo) => {
        return device.deviceId === this.selectedVideoInputDeviceId();
      }) || null;

    if (!activeCamera) {
      return false;
    }

    return (
      this.isTouchDeviceWithCameras() && activeCamera.label.includes('back')
    );
  });

  public readonly hasNoVideoInputsInList = computed<boolean>(() => {
    return checkDeviceListAvailability(this.videoInputsList());
  });

  public readonly audioInputsList = computed<DeviceInfo[]>(() => {
    return createDeviceList(this.enumeratedDevicesList(), 'audioinput');
  });

  public readonly hasNoAudioInputsInList = computed<boolean>(() => {
    return checkDeviceListAvailability(this.audioInputsList());
  });

  // Filter for audio output devices
  public readonly audioOutputsList = computed<DeviceInfo[]>(() => {
    return createDeviceList(this.enumeratedDevicesList(), 'audiooutput');
  });

  public readonly hasNoAudioOutputsInList = computed<boolean>(() => {
    return checkDeviceListAvailability(this.audioOutputsList());
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
  public readonly hasRemotePeerSharedScreen = signal<boolean>(false);

  public readonly hasRemotePeerEnabledWebCam = signal<boolean>(false);
  public readonly hasRemotePeerEnabledMicrophone = signal<boolean>(false);

  public readonly isLoadingLocalMedia = signal<boolean>(false);
  public readonly isLoadingRemoteMedia = signal<boolean>(false);

  public readonly hasWebcamPermissionDenied = signal<boolean>(false);
  public readonly hasMicrophonePermissionDenied = signal<boolean>(false);

  public readonly hasPiPModeAvailable = signal<boolean>(false);
  public readonly hasCanceledScreenCast = signal<boolean>(false);

  // * Screen recording states
  public readonly isRecording = computed<boolean>(() => {
    return this.screenRecordingService.isRecording();
  });

  public readonly screenRecordingBlobs = signal<ScreenRecordBlob[]>([]);

  public screenRecordingIntervalId: NodeJS.Timeout | null = null;
  public readonly screenRecordingElapsedTimeInSec = signal<number>(0);

  // * Room states
  public readonly roomsList = signal<Room[]>([]);
  public readonly currentRoom = signal<string | null>(null);

  public roomErrorMessage: string | null = null;

  public readonly signalEffect = effect(() => {});

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
      return [...this.chatWebRtcService.getRoomsList()];
    });

    this.socketIO()!.on(
      'wrtc-test',
      (data: { roomName: string; message: string }) => {}
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

    this.chatWebRtcService.resetPeerConnection();

    this.resetScreenRecordingIntervalId();
  }

  private resetScreenRecordingIntervalId = (): void => {
    if (!this.screenRecordingIntervalId) {
      console.error(
        'The screen recording interval is not defined, cannot reset interval, received: ',
        this.screenRecordingIntervalId
      );
      return;
    }

    clearInterval(this.screenRecordingIntervalId);
    this.screenRecordingIntervalId = null;

    this.screenRecordingElapsedTimeInSec.update(() => 0);
  };

  private incrementScreenRecordingElapsed = (): void => {
    this.screenRecordingElapsedTimeInSec.update((prev: number) => {
      return prev + 1;
    });
  };

  private setTabTitle = (title: string): void => {
    this.titlePageService.setTitle(title);
  };

  public formatDuration = (durationInSeconds: number) => {
    const { hours, minutes, seconds } = formatTimeValues(durationInSeconds, {
      formatTimeUnderTenMinutesAndUnderOneHour: true,
      removeLeadingZerosFromHours: true,
    });

    if (hours) {
      return `${hours}:${minutes}:${seconds}`;
    }

    return `${minutes}:${seconds}`;
  };

  private updateWebRTCDevicesAuthorizations = (): void => {
    this.hasEnabledWebcamForWebRTC.update(() => this.showWebcam());
    this.hasEnabledMicrophoneForWebRTC.update(() => this.openMicrophone());
  };

  private setVolumeMeterServiceElements = (): void => {
    const ownProgressElement: HTMLProgressElement =
      this.ownAudioVolumeIndicatorRef!.nativeElement;

    this.ownVolumeAnalyzerService!.setVolumeMeterElement(ownProgressElement);

    const remoteProgressElement: HTMLProgressElement =
      this.remotePeerAudioVolumeIndicatorRef!.nativeElement;

    this.remoteVolumeAnalyzerService!.setVolumeMeterElement(
      remoteProgressElement
    );
  };

  private disconnectFromWebRtcSession = (): void => {
    this.stopRecording();

    this.resetRoomState();

    if (!this.webRtcSessionStarted) {
      return;
    }

    this.chatWebRtcService.endWebRTCSession();
    this.resetWebRTCState();
    this.resetMediaCheckboxes();

    this.resetVolumeBars();

    this.screenRecordingService.setRemoteAudioStream(null, true);

    this.setTabTitle('Support chat');
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
    this.chatWebRtcService.setOnRemotePeerMediaToggleCallback(
      this.setRemotePeerMediaToggle
    );

    // this.chatWebRtcService.setOnRoomLeftCallback();

    this.chatWebRtcService.setOnTrackAddedCallback(this.connectToWebRtcSession);

    this.chatWebRtcService.setOnReceiveToggledScreenShare(
      this.setRemoteScreenShareStatus
    );
    this.chatWebRtcService.setOnScreenShareEndedCallback(this.onScreenShareEnd);
  };

  private setScreenRecorderClassCallbacks = (): void => {
    this.screenRecordingService.setOnScreenStreamEnd(
      this.updateVideoRecordingList
    );
  };

  private connectToWebRtcSession = (event: RTCTrackEvent): void => {
    this.webRtcSessionStarted = true;

    const remoteStream: MediaStream = event.streams[0];

    this.updateWebRTCDevicesAuthorizations();

    // Check if the remote stream contains any audio tracks
    const remoteAudioTracks: MediaStreamTrack[] = remoteStream.getAudioTracks();

    // Check if the remote stream contains any audio tracks
    const remoteVideoTracks: MediaStreamTrack[] = remoteStream.getVideoTracks();

    this.hasRemotePeerSharedWebCam.update(() => {
      return remoteVideoTracks.length > 0;
    });
    this.hasRemotePeerSharedMicrophone.update(() => {
      return remoteAudioTracks.length > 0;
    });

    this.setRemotePeerMediaToggle({
      video: remoteVideoTracks.length > 0,
      audio: remoteAudioTracks.length > 0,
    });

    this.setTabTitle(
      `WebRTC with ${this.otherPeerUserName} in room: ${this.currentRoom()}`
    );

    if (!this.hasRemotePeerSharedMicrophone()) {
      console.warn(
        'No audio tracks in remote stream, skipping volume measurement'
      );

      return;
    }
    this.remoteVolumeAnalyzerService!.setMicrophoneStream(remoteStream);

    this.screenRecordingService.setRemoteAudioStream(remoteStream);

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

    const hasVideoInputDevices: boolean = !this.hasNoVideoInputsInList();
    if (hasVideoInputDevices) {
      this.selectedVideoInputDeviceId.update(() => {
        const defaultDevice: DeviceInfo | null =
          this.videoInputsList().find(
            (videoInput: DeviceInfo) => videoInput.isDefaultDevice
          ) || null;

        return defaultDevice?.deviceId || null;
      });
    }

    const hasAudioInputDevices: boolean = !this.hasNoAudioInputsInList();
    if (hasAudioInputDevices) {
      this.selectedAudioInputDeviceId.update(() => {
        const defaultDevice: DeviceInfo | null =
          this.audioInputsList().find(
            (audioInput: DeviceInfo) => audioInput.isDefaultDevice
          ) || null;

        return defaultDevice?.deviceId || null;
      });
    }
  };

  private resetRoomState = (): void => {
    this.isReceiver = false;
    this.otherPeerUserName = null;
    this.isRemotePeerMediaActive = false;
    this.currentRoom.update(() => null);
  };

  private resetWebRTCState = (): void => {
    this.webRtcSessionStarted = false;

    this.hasRemotePeerSharedWebCam.update(() => false);
    this.hasRemotePeerSharedMicrophone.update(() => false);

    this.setRemotePeerMediaToggle({ video: false, audio: false });

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

    this.canShareScreen.update(() => {
      return 'getDisplayMedia' in navigator.mediaDevices;
    });

    this.canSwitchSpeakerDevice.update(() => {
      const videoElement: HTMLVideoElement = document.createElement('video');

      return 'sinkId' in videoElement;
    });
  };

  private remotePeerHasSharedLocalMediaCallback = ({
    video,
    audio,
  }: {
    video: boolean;
    audio: boolean;
  }) => {
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

    this.isReceiver =
      otherPeerUserName === this.ownUsername() &&
      otherPeerUserName !== this.currentRoom();

    this.otherPeerUserName = this.isReceiver
      ? this.currentRoom()
      : otherPeerUserName;

    this.chatWebRtcService.notifyRemotePeerOfLocalMediaShare({
      video: this.showWebcam(),
      audio: this.openMicrophone(),
    });
  };

  private roomDeletedCallback = (): void => {
    this.disconnectFromWebRtcSession();

    this.currentRoom.update(() => {
      return null;
    });

    this.resetRoomState();
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
    this.chatWebRtcService.joinRoom(roomName, this.ownUsername());

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
    try {
      this.chatWebRtcService.resetLocalStream();

      const selectElement = event.target as HTMLSelectElement;

      this.selectedVideoInputDeviceId.update(() => {
        return selectElement.value;
      });

      if (!this.selectedAudioInputDeviceId()) {
        console.warn(
          'No video input device selected! Has device ID value: ',
          this.selectedAudioInputDeviceId()
        );
      }

      const localStream: MediaStream | null =
        await this.chatWebRtcService.manageLocalStream(
          this.showWebcam(),
          this.openMicrophone(),
          this.selectedVideoInputDeviceId(),
          this.selectedAudioInputDeviceId()
        );

      const webcamVideoElement: HTMLVideoElement =
        this.ownWebCamVideoRef!.nativeElement;

      if (!this.showScreenCast()) {
        this.setVideoElementStream(webcamVideoElement, localStream, true);
      }

      if (this.openMicrophone()) {
        this.ownVolumeAnalyzerService!.setMicrophoneStream(localStream!);
        this.ownVolumeAnalyzerService!.startVolumeMeasurement();
      }
    } catch (error) {
      error as Error;
      console.error(error);

      this.ownVolumeAnalyzerService!.stopVolumeMeasurement();
    }
  };

  public switchMicrophoneDevice = async (event: Event): Promise<void> => {
    const selectElement = event.target as HTMLSelectElement;

    this.selectedAudioInputDeviceId.update(() => {
      return selectElement.value;
    });

    try {
      this.chatWebRtcService.resetLocalStream();

      const audioInputDeviceId: string = selectElement.value;

      const localStream: MediaStream | null =
        await this.chatWebRtcService.manageLocalStream(
          this.showWebcam(),
          this.openMicrophone(),
          this.selectedVideoInputDeviceId(),
          this.selectedAudioInputDeviceId()
        );

      if (!localStream) {
        console.warn('No local stream available');

        return;
      }

      const webcamVideoElement: HTMLVideoElement =
        this.ownWebCamVideoRef!.nativeElement;

      if (!this.showScreenCast()) {
        this.setVideoElementStream(
          webcamVideoElement,
          this.chatWebRtcService.localStream,
          true
        );
      }

      if (this.openMicrophone()) {
        this.ownVolumeAnalyzerService!.setMicrophoneStream(localStream);
        this.ownVolumeAnalyzerService!.startVolumeMeasurement();
      }
    } catch (error) {
      error as Error;
      console.error(error);

      this.ownVolumeAnalyzerService!.stopVolumeMeasurement();
    }
  };

  public switchSpeakerDevice = async (event: Event): Promise<void> => {
    const selectElement = event.target as HTMLSelectElement;
    const audioOutputDeviceId: string = selectElement.value;

    // * We switch the sink ID of the remote video element the audio output comes from that element
    const remoteVideoElement: HTMLVideoElement =
      this.remoteWebCamVideoRef!.nativeElement;

    // @ts-ignore
    // ? The Angular compiler complains about not finding this method even though it exists
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

      const audioTracks: MediaStreamTrack[] = localStream.getAudioTracks();

      if (this.openMicrophone() && audioTracks.length > 0) {
        this.ownVolumeAnalyzerService!.setMicrophoneStream(localStream);
        this.ownVolumeAnalyzerService!.startVolumeMeasurement();
      } else {
        console.warn('No audio tracks available (updateLocalStream)');
      }

      if (!this.showScreenCast()) {
        this.setVideoElementStream(
          webcamVideoElement,
          this.chatWebRtcService.localStream,
          true
        );
      }

      this.hasWebcamPermissionDenied.update(() => false);
      this.hasMicrophonePermissionDenied.update(() => false);
    } catch (error: any) {
      error as Error;

      if (!(error instanceof Error)) {
        return;
      }

      console.error(
        `An unexpected error occurred: ${error.message}`,
        { error },
        error.message,
        error.message.includes('NotAllowedError')
      );

      // Check if it was due to the webcam
      if (this.showWebcam()) {
        this.showWebcam.update(() => false);
        this.hasWebcamPermissionDenied.update(() =>
          error.name.includes('NotAllowedError')
        );
      }

      // Check if it was due to the microphone
      if (this.openMicrophone()) {
        this.openMicrophone.update(() => false);
        this.hasMicrophonePermissionDenied.update(() =>
          error.name.includes('NotAllowedError')
        );
      }

      this.ownVolumeAnalyzerService!.stopVolumeMeasurement();
    }
  };

  private onScreenShareEnd = (event?: Event): void => {
    if (this.showScreenCast()) {
      this.sendScreenShareStatus(false);
    }

    this.showScreenCast.update(() => false);

    const videoElement: HTMLVideoElement =
      this.ownWebCamVideoRef!.nativeElement;

    this.setVideoElementStream(
      videoElement,
      this.chatWebRtcService.localStream!,
      true
    );
  };

  private setVideoElementStream = (
    videoElement: HTMLVideoElement,
    stream: MediaStream | null,
    onlyVideo: boolean = false
  ) => {
    if (onlyVideo && stream) {
      // Create a new MediaStream with only video tracks
      const videoOnlyStream = new MediaStream(stream.getVideoTracks());

      // Set the video element's source to the video-only stream
      videoElement.srcObject = videoOnlyStream;
    } else {
      // Set the video element's source to the full stream (with both audio and video)
      videoElement.srcObject = stream;
    }
  };

  public toggleInputDevicesOnWebRtc = (
    event: Event,
    toggleType: string
  ): void => {
    if (!this.webRtcSessionStarted) {
      console.error('WebRTC session has not started yet');

      return;
    }

    const input = event.currentTarget as HTMLInputElement;

    if (toggleType === 'webcam') {
      this.hasEnabledWebcamForWebRTC.update(() => input.checked);
    } else if (toggleType === 'microphone') {
      this.hasEnabledMicrophoneForWebRTC.update(() => input.checked);
    }

    this.chatWebRtcService.toggleLocalStream(
      this.hasEnabledWebcamForWebRTC(),
      this.hasEnabledMicrophoneForWebRTC()
    );

    const video: boolean =
      this.showWebcam() && this.hasEnabledWebcamForWebRTC();
    const audio: boolean =
      this.openMicrophone() && this.hasEnabledMicrophoneForWebRTC();

    this.chatWebRtcService.notifyRemotePeerOfDeviceToggle({ video, audio });
  };

  private setRemotePeerMediaToggle = (deviceToggles: {
    video: boolean;
    audio: boolean;
  }) => {
    const { video, audio } = deviceToggles;

    this.hasRemotePeerEnabledWebCam.update(() => video);
    this.hasRemotePeerEnabledMicrophone.update(() => audio);
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
   */
  public startScreenCast = async (): Promise<void> => {
    try {
      this.hasCanceledScreenCast.update(() => false);

      const webcamVideoElement: HTMLVideoElement =
        this.ownWebCamVideoRef!.nativeElement;

      const screenStream: MediaStream | null =
        await this.chatWebRtcService.startScreenShare();

      this.setVideoElementStream(webcamVideoElement, screenStream!);

      this.showScreenCast.update(() => true);
      this.sendScreenShareStatus(true);
    } catch (error) {
      error as Error;
      console.error('Error accessing screen stream.', error);

      this.showScreenCast.update(() => false);
      this.hasCanceledScreenCast.update(() => true);
    }
  };

  private sendScreenShareStatus = (isSharingScreen: boolean): void => {
    this.chatWebRtcService.notifyRemotePeerOfScreenShare(isSharingScreen);
  };

  private setRemoteScreenShareStatus = (isSharingScreen: boolean): void => {
    this.hasRemotePeerSharedScreen.update(() => isSharingScreen);
  };

  /**
   * Toggles the screen cast state based on the given event.
   *
   */
  public stopScreenCast = (): void => {
    try {
      if (!this.webRtcSessionStarted) {
        throw new Error(
          'WebRTC session has not started yet, cannot stop screen share'
        );
      }

      this.showScreenCast.update(() => false);
      this.chatWebRtcService.stopScreenShare();
      this.sendScreenShareStatus(false);
    } catch (error) {
      error as Error;
      console.error('Error stopping screen stream.', error);
    }
  };

  public requestPictureInPicture = async (): Promise<void> => {
    try {
      const peerRemoteVideoElement: HTMLVideoElement =
        this.remoteWebCamVideoRef!.nativeElement;

      await this.mediaDisplayModeService.requestPictureInPicture(
        peerRemoteVideoElement
      );
    } catch (error) {
      error as Error;
      console.error('Error requesting picture-in-picture', error);

      this.isPiPToggleEnabledOnTabSwitch.update(() => false);
    }
  };

  public removePictureInPicture = async (): Promise<void> => {
    await this.mediaDisplayModeService.removePictureInPicture();
  };

  public togglePiPOnTabSwitch = (): void => {
    this.isPiPToggleEnabledOnTabSwitch.update((prev) => !prev);
  };

  private togglePiPVideoElement = (): void => {
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

  public requestRemoteScreenShareFullscreen = async (): Promise<void> => {
    const peerRemoteVideoElement: HTMLVideoElement =
      this.remoteWebCamVideoRef!.nativeElement;

    await this.mediaDisplayModeService.enterFullscreenMode(
      peerRemoteVideoElement
    );
  };

  public stopRemoteScreenShareFullscreen = async (): Promise<void> => {
    await this.mediaDisplayModeService.exitFullscreenMode();
  };

  public startRecording = async (): Promise<void> => {
    const recordingStream: MediaStream | null =
      await this.screenRecordingService.startRecording(
        this.selectedAudioInputDeviceId()!
      );

    this.screenRecordingIntervalId = setInterval(
      this.incrementScreenRecordingElapsed,
      1_000
    );

    const videoTracks: MediaStreamTrack[] = recordingStream!.getVideoTracks();

    const recordingStreamNoSound = new MediaStream(videoTracks);

    const videoRecordingElement: HTMLVideoElement =
      this.videoRecordingElementRef!.nativeElement;

    this.setVideoElementStream(videoRecordingElement, recordingStreamNoSound);
  };

  public stopRecording = (): void => {
    this.screenRecordingService.stopRecording();

    this.resetScreenRecordingIntervalId();
  };

  public removeBlobFromListByIndex = (index: number): void => {
    const specificBlob: ScreenRecordBlob = this.screenRecordingBlobs()[index];

    if (!specificBlob) {
      console.error('No blob available to remove at index:', index);

      return;
    }

    this.screenRecordingBlobs.update((prev: ScreenRecordBlob[]) => {
      prev.splice(index, 1);

      return [...prev];
    });

    const { objectUrl } = specificBlob;
    URL.revokeObjectURL(objectUrl);
  };

  public removeAllBlobs = (): void => {
    for (const screenRecordingBlob of this.screenRecordingBlobs()) {
      const { objectUrl } = screenRecordingBlob;

      URL.revokeObjectURL(objectUrl);
    }

    this.screenRecordingBlobs.update(() => []);
  };

  private updateVideoRecordingList = (): void => {
    if (this.screenRecordingIntervalId) {
      this.resetScreenRecordingIntervalId();
    }

    const screenRecordAsBlob: ScreenRecordBlob | null =
      this.screenRecordingService.recordedBlob();
    if (!screenRecordAsBlob?.blob) {
      console.error('No blob available to download');

      return;
    }

    this.screenRecordingBlobs.update((prev: ScreenRecordBlob[]) => {
      return [...prev, screenRecordAsBlob];
    });

    const videoRecordingElement: HTMLVideoElement =
      this.videoRecordingElementRef!.nativeElement;

    this.setVideoElementStream(videoRecordingElement, null);
  };
}
