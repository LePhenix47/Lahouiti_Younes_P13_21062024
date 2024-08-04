import { DeviceInfo } from '@core/types/videoconference/videoconference.types';

export function createDeviceList(
  devicesArray: MediaDeviceInfo[],
  deviceKind: MediaDeviceKind
): DeviceInfo[] {
  const specificDevicesArray: MediaDeviceInfo[] = devicesArray.filter(
    (device: MediaDeviceInfo) => device.kind === deviceKind
  );

  const combinedDeviceMap = new Map<string, DeviceInfo>();
  let deviceGroupId: string = '';

  for (const device of specificDevicesArray) {
    if (device.deviceId === 'default' || device.deviceId === 'communications') {
      deviceGroupId = device.groupId; // Capture the groupId of the default device
    }

    if (
      combinedDeviceMap.has(device.groupId) ||
      device.deviceId === 'default' ||
      device.deviceId === 'communications'
    ) {
      continue; // Skip further processing for duplicates
    }

    // Create a new device object, copying the properties manually
    const newDevice: DeviceInfo = {
      deviceId: device.deviceId,
      kind: device.kind,
      label: device.label,
      groupId: device.groupId,
      isDefaultDevice: deviceGroupId === device.groupId,
    };

    combinedDeviceMap.set(device.groupId, newDevice); // Add to the map
  }

  // Convert the map back to an array
  return Array.from(combinedDeviceMap.values());
}
