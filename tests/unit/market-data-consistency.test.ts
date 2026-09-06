import { describe, it, expect } from 'vitest';
import { getMarketStatus, getISTDateParts, getLatestTradingSessionDate } from '../../src/utils/market-status.utils.js';
import { StockService } from '../../src/services/stock.service.js';

describe('Market Data Consistency & IST Market Status Utility', () => {
  it('correctly parses IST date parts for a given Date', () => {
    // Sunday, Sep 6, 2026
    const sundayDate = new Date('2026-09-06T10:00:00Z');
    const parts = getISTDateParts(sundayDate);
    expect(parts.year).toBe(2026);
    expect(parts.isoDateStr).toContain('2026-09-06');
    expect(parts.dayOfWeek).toBe(0); // Sunday
  });

  it('classifies Saturday and Sunday as WEEKEND status with Friday session message', () => {
    // Sunday, Sep 6, 2026
    const sundayDate = new Date('2026-09-06T10:00:00Z');
    const status = getMarketStatus(sundayDate);

    expect(status.status).toBe('WEEKEND');
    expect(status.isWeekend).toBe(true);
    expect(status.isMarketOpen).toBe(false);
    expect(status.sessionDate).toBe('2026-09-04'); // Friday
    expect(status.statusMessage).toContain('NSE/BSE markets are closed today');
    expect(status.statusMessage).toContain('Friday, Sep 4, 2026');
  });

  it('classifies Monday 10:30 AM IST as OPEN status', () => {
    // Monday, Sep 7, 2026 10:30 AM IST = 05:00 AM UTC
    const mondayOpenDate = new Date('2026-09-07T05:00:00Z');
    const status = getMarketStatus(mondayOpenDate);

    expect(status.status).toBe('OPEN');
    expect(status.isMarketOpen).toBe(true);
    expect(status.isWeekend).toBe(false);
    expect(status.statusMessage).toContain('NSE/BSE markets are open');
  });

  it('formats snapshot with consistent previousClose, changeAmount, and direction', () => {
    const rawSnapshot = {
      id: 'snap-1',
      stockId: 'stock-1',
      price: '1568.34',
      changePercent: -0.65,
      volume: '7819999',
      dataTimestamp: new Date(),
      recordedAt: new Date(),
    };

    const formatted = StockService.formatSnapshotResponse(rawSnapshot);

    expect(formatted.price).toBe(1568.34);
    expect(formatted.changePercent).toBe(-0.65);
    expect(formatted.direction).toBe('negative'); // Negative change -> red
    expect(formatted.previousClose).toBeGreaterThan(formatted.price); // Previous close higher on drop
    expect(formatted.changeAmount).toBeLessThan(0);
  });

  it('formats positive change snapshot with positive direction', () => {
    const rawSnapshot = {
      id: 'snap-2',
      stockId: 'stock-2',
      price: '1690.98',
      changePercent: 1.73,
      volume: '8500000',
      dataTimestamp: new Date(),
      recordedAt: new Date(),
    };

    const formatted = StockService.formatSnapshotResponse(rawSnapshot);

    expect(formatted.price).toBe(1690.98);
    expect(formatted.changePercent).toBe(1.73);
    expect(formatted.direction).toBe('positive'); // Positive change -> green
    expect(formatted.previousClose).toBeLessThan(formatted.price);
    expect(formatted.changeAmount).toBeGreaterThan(0);
  });

  it('formats zero change snapshot with neutral direction', () => {
    const rawSnapshot = {
      id: 'snap-3',
      stockId: 'stock-3',
      price: '1000.00',
      changePercent: 0,
      volume: '500000',
      dataTimestamp: new Date(),
      recordedAt: new Date(),
    };

    const formatted = StockService.formatSnapshotResponse(rawSnapshot);

    expect(formatted.price).toBe(1000.00);
    expect(formatted.changePercent).toBe(0);
    expect(formatted.direction).toBe('neutral');
    expect(formatted.changeAmount).toBe(0);
  });

  it('correctly calculates OPEN market status for Monday Sep 7, 2026 trading session', () => {
    // Simulate Monday, Sep 7, 2026 at 10:30 AM IST (05:00 AM UTC)
    const mondayDate = new Date('2026-09-07T05:00:00Z');
    const status = getMarketStatus(mondayDate);

    expect(status.status).toBe('OPEN');
    expect(status.isMarketOpen).toBe(true);
    expect(status.sessionDate).toBe('2026-09-07');
    expect(status.sessionDateLabel).toBe('Today');
    expect(status.statusMessage).toContain('NSE/BSE markets are open');
  });

  it('verifies Monday intraday price change percentage is calculated against Friday previous close', () => {
    // Friday Sep 4 closing price: ₹1,834.99
    // Monday Sep 7 live price: ₹1,850.95 (+0.87% gain)
    const mondaySnapshot = {
      id: 'snap-mon-1',
      stockId: 'infy-stock-id',
      price: '1850.95',
      changePercent: 0.87,
      volume: '4500000',
      dataTimestamp: new Date('2026-09-07T05:00:00Z'),
      recordedAt: new Date('2026-09-07T05:00:00Z'),
    };

    const formatted = StockService.formatSnapshotResponse(mondaySnapshot);

    // Monday price: ₹1,850.95
    expect(formatted.price).toBe(1850.95);
    expect(formatted.changePercent).toBe(0.87);

    // Calculated previous close (Friday close): ₹1,834.99
    const expectedFridayClose = Number((1850.95 / 1.0087).toFixed(2));
    expect(formatted.previousClose).toBe(expectedFridayClose);

    // Monday change amount against Friday close: +15.96
    const expectedChangeAmount = Number((1850.95 - expectedFridayClose).toFixed(2));
    expect(formatted.changeAmount).toBe(expectedChangeAmount);
  });
});
