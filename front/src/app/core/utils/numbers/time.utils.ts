import {
  FormattedDuration,
  TimeValueOptions,
} from '@core/types/helpers/time.types';

/**
 * Formats a given number of seconds into a time object containing formatted hours, minutes, and seconds.
 * If the time is over an hour but less than 10 minutes, the minutes are also formatted.
 *
 * @param {number} timeInSeconds - The amount of seconds to format.
 * @param {object} [options] - Optional formatting options.
 * @param {boolean} [options.formatMinutesUnderTen=false] - Format minutes if they're under 10 minutes but under one hour.
 * @param {boolean} [options.removeLeadingZerosFromHours=false] - Remove leading zeros from hours if they're under 10.
 * @return {{hours: string, minutes: string, seconds: string}} - A time object containing formatted hours, minutes, and seconds.
 */
export function formatTimeValues(
  timeInSeconds: number,
  options?: TimeValueOptions
): Readonly<FormattedDuration> {
  const totalMinutes: number = Math.trunc(timeInSeconds / 60);
  const totalHours: number = Math.trunc(timeInSeconds / 3_600);

  const remainingSeconds: number = timeInSeconds % 60;
  let formattedSeconds: string = remainingSeconds.toString().padStart(2, '0');

  const minutes: number = totalMinutes % 60;
  let formattedMinutes: string = minutes.toString();

  const addLeadingZerosInMinutes: boolean =
    Boolean(options?.formatTimeUnderTenMinutesAndUnderOneHour) &&
    totalHours >= 1 &&
    minutes < 10;

  if (addLeadingZerosInMinutes) {
    formattedMinutes = minutes.toString().padStart(2, '0');
  }

  let formattedHours: string = totalHours.toString();
  const removeLeadingZerosInHours: boolean =
    Boolean(options?.removeLeadingZerosFromHours) && totalHours < 10;

  if (removeLeadingZerosInHours) {
    formattedHours = formattedHours.replace(/^0/, '');
  }

  const addLeadingZerosToAllNumbers: boolean = Boolean(
    options?.alwaysAddLeadingZeros
  );

  if (addLeadingZerosToAllNumbers) {
    formattedHours = formattedHours.padStart(2, '0');
    formattedMinutes = formattedMinutes.padStart(2, '0');
    formattedSeconds = formattedSeconds.padStart(2, '0');
  }

  return {
    hours: formattedHours,
    minutes: formattedMinutes,
    seconds: formattedSeconds,
  };
}
