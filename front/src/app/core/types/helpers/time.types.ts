export type TimeValueOptions = Partial<{
  formatTimeUnderTenMinutesAndUnderOneHour: boolean;
  removeLeadingZerosFromHours: boolean;
  alwaysAddLeadingZeros: boolean;
}>;

export type FormattedDuration = {
  hours: string;
  minutes: string;
  seconds: string;
};
