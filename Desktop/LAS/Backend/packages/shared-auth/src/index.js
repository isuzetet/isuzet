"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = exports.FLEET_MANAGER_ALLOWED_ROUTES = exports.generateOtp = exports.decryptPII = exports.encryptPII = void 0;
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyToken = verifyToken;
exports.verifyAccessToken = verifyAccessToken;
exports.revokeToken = revokeToken;
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.storeOtp = storeOtp;
exports.verifyOtp = verifyOtp;
exports.normalizePhone = normalizePhone;
const jose_1 = require("jose");
const ioredis_1 = require("ioredis");
const ulid_1 = require("ulid");
const crypto_1 = require("crypto");
// Re-export from encrypt.ts
var encrypt_1 = require("./encrypt");
Object.defineProperty(exports, "encryptPII", { enumerable: true, get: function () { return encrypt_1.encryptPII; } });
Object.defineProperty(exports, "decryptPII", { enumerable: true, get: function () { return encrypt_1.decryptPII; } });
// Re-export from otp.ts
var otp_1 = require("./otp");
Object.defineProperty(exports, "generateOtp", { enumerable: true, get: function () { return otp_1.generateOtp; } });
// Custom storeOtp and verifyOtp that don't require Redis parameter
const otp_2 = require("./otp");
const redis = new ioredis_1.Redis(process.env.REDIS_URL || 'redis://localhost:6379');
exports.redis = redis;
async function getPrivateKey() {
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    const keyPath = process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem';
    const key = fs.readFileSync(keyPath, 'utf-8');
    return (0, crypto_1.createPrivateKey)(key);
}
async function getPublicKey() {
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    const keyPath = process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem';
    const key = fs.readFileSync(keyPath, 'utf-8');
    return (0, crypto_1.createPublicKey)(key);
}
async function signAccessToken(payload) {
    const jti = (0, ulid_1.ulid)();
    return new jose_1.SignJWT({ ...payload, jti })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('15m')
        .setJti(jti)
        .sign(await getPrivateKey());
}
async function signRefreshToken(userId) {
    const jti = (0, ulid_1.ulid)();
    const token = await new jose_1.SignJWT({ sub: userId, jti })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .setJti(jti)
        .sign(await getPrivateKey());
    await redis.setex(`refresh:${jti}`, 2592000, userId);
    return token;
}
async function verifyToken(token) {
    const { payload } = await (0, jose_1.jwtVerify)(token, await getPublicKey());
    const jti = payload.jti;
    const revoked = await redis.get(`revoked:${jti}`);
    if (revoked)
        throw new Error('Token revoked');
    return payload;
}
// Alias for verifyToken
async function verifyAccessToken(token) {
    return verifyToken(token);
}
async function revokeToken(jti) {
    await redis.setex(`revoked:${jti}`, 86400, '1');
}
function requireAuth() {
    return async (request, reply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            reply.status(401).send({ error: 'Unauthorized' });
            return;
        }
        const token = authHeader.substring(7);
        try {
            const payload = await verifyToken(token);
            request.user = payload;
        }
        catch (error) {
            reply.status(401).send({ error: 'Invalid token' });
            return;
        }
    };
}
function requireRole(roles) {
    return async (request, reply) => {
        const userRole = request.user?.role;
        if (!userRole || !roles.includes(userRole)) {
            reply.status(403).send({ error: 'Forbidden' });
            return;
        }
    };
}
// Wrapper functions for OTP that use internal redis client
async function storeOtp(phone, otp) {
    return (0, otp_2.storeOtp)(redis, phone, otp);
}
async function verifyOtp(phone, otp) {
    return (0, otp_2.verifyOtp)(redis, phone, otp);
}
function normalizePhone(phone) {
    const stripped = phone.replace(/^0/, '');
    if (stripped.startsWith('+251'))
        return stripped;
    if (stripped.startsWith('251'))
        return `+${stripped}`;
    return `+251${stripped}`;
}
exports.FLEET_MANAGER_ALLOWED_ROUTES = [
    'loads:read', 'loads:assign', 'trucks:read',
    'drivers:read', 'trips:manage', 'incidents:report'
];
//# sourceMappingURL=index.js.map