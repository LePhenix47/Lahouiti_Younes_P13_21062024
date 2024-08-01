export type Room = {
  roomName: string;
  isFull: boolean;
};

export type DeviceInfo = Omit<MediaDeviceInfo, 'toJSON'> & {
  isDefaultDevice: boolean;
};
