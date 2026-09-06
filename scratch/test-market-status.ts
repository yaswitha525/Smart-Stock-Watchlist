import { getMarketStatus, getISTDateParts } from '../src/utils/market-status.utils.js';

console.log('Current IST Time:', getISTDateParts());
console.log('Market Status Object:', getMarketStatus());
