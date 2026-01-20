/**
 * Common timezone options for user selection
 */

export interface TimezoneOption {
  value: string;
  label: string;
  group: string;
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  // US Timezones
  {
    value: "America/Chicago",
    label: "Central Time (CT)",
    group: "United States",
  },
  {
    value: "America/New_York",
    label: "Eastern Time (ET)",
    group: "United States",
  },
  {
    value: "America/Denver",
    label: "Mountain Time (MT)",
    group: "United States",
  },
  {
    value: "America/Los_Angeles",
    label: "Pacific Time (PT)",
    group: "United States",
  },
  {
    value: "America/Anchorage",
    label: "Alaska Time (AKT)",
    group: "United States",
  },
  {
    value: "Pacific/Honolulu",
    label: "Hawaii Time (HST)",
    group: "United States",
  },

  // Canada
  {
    value: "America/Toronto",
    label: "Eastern Time (Toronto)",
    group: "Canada",
  },
  {
    value: "America/Winnipeg",
    label: "Central Time (Winnipeg)",
    group: "Canada",
  },
  {
    value: "America/Edmonton",
    label: "Mountain Time (Edmonton)",
    group: "Canada",
  },
  {
    value: "America/Vancouver",
    label: "Pacific Time (Vancouver)",
    group: "Canada",
  },

  // Europe
  {
    value: "Europe/London",
    label: "Greenwich Mean Time (GMT)",
    group: "Europe",
  },
  {
    value: "Europe/Paris",
    label: "Central European Time (CET)",
    group: "Europe",
  },
  {
    value: "Europe/Berlin",
    label: "Central European Time (Berlin)",
    group: "Europe",
  },
  {
    value: "Europe/Madrid",
    label: "Central European Time (Madrid)",
    group: "Europe",
  },
  {
    value: "Europe/Rome",
    label: "Central European Time (Rome)",
    group: "Europe",
  },
  {
    value: "Europe/Amsterdam",
    label: "Central European Time (Amsterdam)",
    group: "Europe",
  },

  // Asia Pacific
  {
    value: "Asia/Tokyo",
    label: "Japan Standard Time (JST)",
    group: "Asia Pacific",
  },
  {
    value: "Asia/Shanghai",
    label: "China Standard Time (CST)",
    group: "Asia Pacific",
  },
  {
    value: "Asia/Seoul",
    label: "Korea Standard Time (KST)",
    group: "Asia Pacific",
  },
  {
    value: "Asia/Singapore",
    label: "Singapore Standard Time (SGT)",
    group: "Asia Pacific",
  },
  {
    value: "Australia/Sydney",
    label: "Australian Eastern Time (AEDT)",
    group: "Asia Pacific",
  },
  {
    value: "Australia/Melbourne",
    label: "Australian Eastern Time (Melbourne)",
    group: "Asia Pacific",
  },

  // Other Common
  { value: "UTC", label: "Coordinated Universal Time (UTC)", group: "Other" },
  {
    value: "America/Sao_Paulo",
    label: "Brasília Time (BRT)",
    group: "South America",
  },
  {
    value: "America/Mexico_City",
    label: "Central Standard Time (Mexico)",
    group: "North America",
  },
];

export function getTimezoneGroups(): Record<string, TimezoneOption[]> {
  const groups: Record<string, TimezoneOption[]> = {};

  COMMON_TIMEZONES.forEach((timezone) => {
    if (!groups[timezone.group]) {
      groups[timezone.group] = [];
    }
    groups[timezone.group].push(timezone);
  });

  return groups;
}

export function findTimezoneByValue(value: string): TimezoneOption | undefined {
  return COMMON_TIMEZONES.find((tz) => tz.value === value);
}

export function getCurrentTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York"; // fallback
  }
}

export function getTimezoneDisplayName(timezone: string): string {
  const option = findTimezoneByValue(timezone);
  return option ? option.label : timezone;
}
