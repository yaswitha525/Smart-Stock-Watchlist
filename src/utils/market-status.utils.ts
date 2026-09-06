/**
 * Utility for Indian Equity Market (NSE/BSE) trading hours & market status
 * evaluated in India Standard Time (Asia/Kolkata / UTC+5:30).
 */

export interface MarketStatusInfo {
  status: 'OPEN' | 'CLOSED' | 'WEEKEND';
  isWeekend: boolean;
  isMarketOpen: boolean;
  sessionDate: string; // ISO format date 'YYYY-MM-DD'
  sessionDateFormatted: string; // Human readable date e.g. 'Friday, Sep 4, 2026'
  sessionDateFormattedShort: string; // Short date e.g. 'Fri, Sep 4'
  sessionDateLabel: string; // 'Today' when market open, or 'Fri, Sep 4' when closed
  statusMessage: string;
}

/**
 * Returns current date/time parts in Asia/Kolkata timezone.
 */
export function getISTDateParts(date: Date = new Date()): {
  year: number;
  month: number; // 0-11
  day: number;
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  hours: number;
  minutes: number;
  formattedDateStr: string;
  isoDateStr: string;
} {
  // Example istString: "Sun, 9/6/2026, 10:20"
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10) - 1; // 0-indexed
  const day = parseInt(map.day, 10);
  const hours = parseInt(map.hour, 10);
  const minutes = parseInt(map.minute, 10);

  const dayOfWeekStr = map.weekday;
  const dayOfWeekMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = dayOfWeekMap[dayOfWeekStr] ?? 0;

  const istDateObj = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const formattedDateStr = istDateObj.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isoDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return {
    year,
    month,
    day,
    dayOfWeek,
    hours,
    minutes,
    formattedDateStr,
    isoDateStr,
  };
}

/**
 * Returns the date of the latest valid trading session (Friday if weekend).
 */
export function getLatestTradingSessionDate(date: Date = new Date()): Date {
  const parts = getISTDateParts(date);
  const currentIST = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  if (parts.dayOfWeek === 6) {
    // Saturday -> Go back 1 day to Friday
    currentIST.setDate(currentIST.getDate() - 1);
  } else if (parts.dayOfWeek === 0) {
    // Sunday -> Go back 2 days to Friday
    currentIST.setDate(currentIST.getDate() - 2);
  } else if (parts.hours < 9 || (parts.hours === 9 && parts.minutes < 15)) {
    // Before 09:15 AM IST on weekday -> Go back to previous day (or Friday if Monday)
    if (parts.dayOfWeek === 1) {
      currentIST.setDate(currentIST.getDate() - 3);
    } else {
      currentIST.setDate(currentIST.getDate() - 1);
    }
  }

  return currentIST;
}

/**
 * Computes complete MarketStatusInfo for Indian Equity Markets (NSE/BSE) in IST.
 */
export function getMarketStatus(date: Date = new Date()): MarketStatusInfo {
  const parts = getISTDateParts(date);
  const isWeekend = parts.dayOfWeek === 0 || parts.dayOfWeek === 6;

  // NSE/BSE Trading Hours: Monday to Friday, 09:15 to 15:30 IST
  const timeInMinutes = parts.hours * 60 + parts.minutes;
  const marketOpenMinutes = 9 * 60 + 15; // 09:15 AM
  const marketCloseMinutes = 15 * 60 + 30; // 03:30 PM

  const isWithinHours = timeInMinutes >= marketOpenMinutes && timeInMinutes <= marketCloseMinutes;
  const isMarketOpen = !isWeekend && isWithinHours;

  let status: 'OPEN' | 'CLOSED' | 'WEEKEND';
  if (isWeekend) {
    status = 'WEEKEND';
  } else if (isMarketOpen) {
    status = 'OPEN';
  } else {
    status = 'CLOSED';
  }

  const latestSessionDateObj = getLatestTradingSessionDate(date);
  const sessionParts = getISTDateParts(latestSessionDateObj);
  const sessionDateFormatted = sessionParts.formattedDateStr;
  const sessionDate = sessionParts.isoDateStr;

  const sessionDateObj = new Date(latestSessionDateObj.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const sessionDateFormattedShort = sessionDateObj.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const sessionDateLabel = isMarketOpen ? 'Today' : sessionDateFormattedShort;

  let statusMessage: string;
  if (isMarketOpen) {
    statusMessage = 'NSE/BSE markets are open — live trading session in progress.';
  } else if (isWeekend) {
    statusMessage = `NSE/BSE markets are closed today. Showing latest available trading data from ${sessionDateFormatted}.`;
  } else {
    statusMessage = `Market closed. Showing latest available trading data from ${sessionDateFormatted}.`;
  }

  return {
    status,
    isWeekend,
    isMarketOpen,
    sessionDate,
    sessionDateFormatted,
    sessionDateFormattedShort,
    sessionDateLabel,
    statusMessage,
  };
}
