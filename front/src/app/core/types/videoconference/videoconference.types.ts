import { PrettifyObject } from '../ts/ts-helpers.types';

export type Room = {
  roomName: string;
  isFull: boolean;
};

export type DeviceInfo = PrettifyObject<
  Omit<MediaDeviceInfo, 'toJSON'> & {
    readonly isDefaultDevice: boolean;
  }
>;
