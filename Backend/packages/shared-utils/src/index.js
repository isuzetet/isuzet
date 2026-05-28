"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = exports.hasCache = exports.setCache = exports.getCacheWithTtl = exports.invalidateCachePattern = exports.invalidateCache = exports.cached = void 0;
exports.generateId = generateId;
exports.formatETB = formatETB;
exports.parseETB = parseETB;
exports.getAmharicMonth = getAmharicMonth;
exports.toEthiopianDate = toEthiopianDate;
exports.formatDateResponse = formatDateResponse;
exports.getEthiopianFiscalYear = getEthiopianFiscalYear;
exports.normalizePhone = normalizePhone;
const ulid_1 = require("ulid");
function generateId(prefix) {
    return `${prefix}_${(0, ulid_1.ulid)()}`;
}
function formatETB(amount) {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toFixed(2);
}
function parseETB(value) {
    return parseFloat(value);
}
const AMHARIC_MONTHS = ['መስከረም', 'ጥቅምት', 'ህዳር', 'ታህሳስ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዚያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'];
function getAmharicMonth(monthNumber) {
    return AMHARIC_MONTHS[monthNumber - 1] ?? '';
}
function toEthiopianDate(date) {
    const gregYear = date.getFullYear();
    const ethYear = gregYear - 8;
    const month = date.getMonth();
    const day = date.getDate();
    const amMonth = ((month + 4) % 12) + 1;
    const amDay = ((day + 10) % 30) + 1;
    return {
        day: amDay,
        month: amMonth,
        year: ethYear,
        monthName: AMHARIC_MONTHS[amMonth - 1] ?? '',
        amharicDate: `${amDay} ${AMHARIC_MONTHS[amMonth - 1] ?? ''} ${ethYear}`,
    };
}
function formatDateResponse(date) {
    const eth = toEthiopianDate(date);
    return {
        gregorian_date: date.toISOString().split('T')[0] ?? '',
        ethiopian_date: eth.amharicDate,
    };
}
function getEthiopianFiscalYear(date) {
    const gregYear = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    if (month > 6 || (month === 6 && day >= 8)) {
        return gregYear - 7;
    }
    return gregYear - 8;
}
function normalizePhone(phone) {
    const stripped = phone.replace(/^0/, '');
    if (stripped.startsWith('+251'))
        return stripped;
    if (stripped.startsWith('251'))
        return `+${stripped}`;
    return `+251${stripped}`;
}
// Re-export all cache utilities from cache.ts
var cache_js_1 = require("./cache.js");
Object.defineProperty(exports, "cached", { enumerable: true, get: function () { return cache_js_1.cached; } });
Object.defineProperty(exports, "invalidateCache", { enumerable: true, get: function () { return cache_js_1.invalidateCache; } });
Object.defineProperty(exports, "invalidateCachePattern", { enumerable: true, get: function () { return cache_js_1.invalidateCachePattern; } });
Object.defineProperty(exports, "getCacheWithTtl", { enumerable: true, get: function () { return cache_js_1.getCacheWithTtl; } });
Object.defineProperty(exports, "setCache", { enumerable: true, get: function () { return cache_js_1.setCache; } });
Object.defineProperty(exports, "hasCache", { enumerable: true, get: function () { return cache_js_1.hasCache; } });
Object.defineProperty(exports, "getRedisClient", { enumerable: true, get: function () { return cache_js_1.getRedisClient; } });
//# sourceMappingURL=index.js.map