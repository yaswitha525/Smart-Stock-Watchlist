/**
 * Client-side Market Status & IST Trading Session utility.
 * Evaluates Indian Equity Markets (NSE/BSE) status strictly in India Standard Time (Asia/Kolkata / UTC+5:30).
 */

export interface MarketStatusInfo {
  status: 'OPEN' | 'CLOSED' | 'WEEKEND';
  isWeekend: boolean;
  isMarketOpen: boolean;
  sessionDate: string; // ISO date 'YYYY-MM-DD'
  sessionDateFormatted: string; // 'Friday, Sep 4, 2026'
  sessionDateFormattedShort: string; // 'Fri, Sep 4'
  sessionDateLabel: string; // 'Today' when open, or 'Fri, Sep 4' when closed
  statusMessage: string;
}

export function getISTMarketStatus(date: Date = new Date()): MarketStatusInfo {
  // Format parts in Asia/Kolkata timezone
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

  const hours = parseInt(map.hour, 10);
  const minutes = parseInt(map.minute, 10);

  const dayOfWeekMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = dayOfWeekMap[map.weekday] ?? 0;

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Trading Hours: Mon-Fri, 09:15 to 15:30 IST
  const timeInMinutes = hours * 60 + minutes;
  const marketOpenMinutes = 9 * 60 + 15; // 09:15
  const marketCloseMinutes = 15 * 60 + 30; // 15:30

  const isMarketOpen = !isWeekend && timeInMinutes >= marketOpenMinutes && timeInMinutes <= marketCloseMinutes;

  let status: 'OPEN' | 'CLOSED' | 'WEEKEND';
  if (isWeekend) {
    status = 'WEEKEND';
  } else if (isMarketOpen) {
    status = 'OPEN';
  } else {
    status = 'CLOSED';
  }

  // Determine latest trading session date
  const sessionDateObj = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  if (dayOfWeek === 6) {
    sessionDateObj.setDate(sessionDateObj.getDate() - 1); // Saturday -> Friday
  } else if (dayOfWeek === 0) {
    sessionDateObj.setDate(sessionDateObj.getDate() - 2); // Sunday -> Friday
  } else if (timeInMinutes < marketOpenMinutes) {
    if (dayOfWeek === 1) {
      sessionDateObj.setDate(sessionDateObj.getDate() - 3); // Mon before 09:15 -> Friday
    } else {
      sessionDateObj.setDate(sessionDateObj.getDate() - 1);
    }
  }

  const sessionDateFormatted = sessionDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const sessionDateFormattedShort = sessionDateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const sessionDateLabel = isMarketOpen ? 'Today' : sessionDateFormattedShort;

  const sessionYear = sessionDateObj.getFullYear();
  const sessionMonth = String(sessionDateObj.getMonth() + 1).padStart(2, '0');
  const sessionDay = String(sessionDateObj.getDate()).padStart(2, '0');
  const sessionDate = `${sessionYear}-${sessionMonth}-${sessionDay}`;

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
