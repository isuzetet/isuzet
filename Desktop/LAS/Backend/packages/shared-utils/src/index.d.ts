export declare function generateId(prefix: string): string;
export declare function formatETB(amount: number | string): string;
export declare function parseETB(value: string): number;
export declare function getAmharicMonth(monthNumber: number): string;
export declare function toEthiopianDate(date: Date): {
    day: number;
    month: number;
    year: number;
    monthName: string;
    amharicDate: string;
};
export declare function formatDateResponse(date: Date): {
    gregorian_date: string;
    ethiopian_date: string;
};
export declare function getEthiopianFiscalYear(date: Date): number;
export declare function normalizePhone(phone: string): string;
export { cached, invalidateCache, invalidateCachePattern, getCacheWithTtl, setCache, hasCache, getRedisClient } from './cache.js';
//# sourceMappingURL=index.d.ts.map