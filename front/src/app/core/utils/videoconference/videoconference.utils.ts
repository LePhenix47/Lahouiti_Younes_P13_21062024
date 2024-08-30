import { DeviceInfo } from '@core/types/videoconference/videoconference.types';

export function createDeviceList(
  devicesArray: MediaDeviceInfo[],
  deviceKind: MediaDeviceKind
): DeviceInfo[] {
  const specificDevicesArray: MediaDeviceInfo[] = devicesArray.filter(
    (device: MediaDeviceInfo) => device.kind === deviceKind
  );

  const commonDeviceLabel: string | null =
    specificDevicesArray.find((device: MediaDeviceInfo) => {
      return device.deviceId === 'communications';
    })?.label || null;

  const arrayOfDevices = [];
  for (const device of specificDevicesArray) {
    if (device.deviceId === 'communications' || device.deviceId === 'default') {
      continue;
    }

    // Create a new device object, copying the properties manually
    const newDevice: DeviceInfo = {
      deviceId: device.deviceId,
      kind: device.kind,
      label: device.label,
      groupId: device.groupId,
      isDefaultDevice: commonDeviceLabel?.includes(device.label) || false,
    };

    arrayOfDevices.push(newDevice); // Add to the map
  }

  // Convert the map back to an array
  return arrayOfDevices;
}

/**
 * Checks if the list of device information is empty or contains only one default device that doesn't have a device ID.
 *
 * @param deviceInfo The list of device information objects to check.
 * @returns A boolean indicating whether the list of devices is available or not.
 */
export function checkDeviceListAvailability(deviceInfo: DeviceInfo[]) {
  return (
    deviceInfo.length < 1 ||
    (deviceInfo.length === 1 && !deviceInfo[0].deviceId)
  );
}
