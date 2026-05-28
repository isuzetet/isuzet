"use strict";
/**
 * RUIT CBE — Role Definitions
 * All system roles for RBAC
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIENT_ROLES = exports.OPS_ROLES = exports.USER_ROLES = exports.ROLES = void 0;
exports.ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    OPS_ADMIN: 'OPS_ADMIN',
    OPS_VIEWER: 'OPS_VIEWER',
    FINANCE_OPS: 'FINANCE_OPS',
    FLEET_OWNER: 'FLEET_OWNER',
    FLEET_MANAGER: 'FLEET_MANAGER',
    ORDERER: 'ORDERER',
    DRIVER: 'DRIVER',
    FIELD_AGENT: 'FIELD_AGENT',
    BROKER: 'BROKER',
    SYSTEM_SERVICE: 'SYSTEM_SERVICE',
};
exports.USER_ROLES = [
    exports.ROLES.SUPER_ADMIN,
    exports.ROLES.OPS_ADMIN,
    exports.ROLES.OPS_VIEWER,
    exports.ROLES.FINANCE_OPS,
    exports.ROLES.FLEET_OWNER,
    exports.ROLES.FLEET_MANAGER,
    exports.ROLES.ORDERER,
    exports.ROLES.DRIVER,
    exports.ROLES.FIELD_AGENT,
    exports.ROLES.BROKER,
];
exports.OPS_ROLES = [
    exports.ROLES.SUPER_ADMIN,
    exports.ROLES.OPS_ADMIN,
    exports.ROLES.OPS_VIEWER,
    exports.ROLES.FINANCE_OPS,
];
exports.CLIENT_ROLES = [
    exports.ROLES.FLEET_OWNER,
    exports.ROLES.FLEET_MANAGER,
    exports.ROLES.ORDERER,
    exports.ROLES.DRIVER,
    exports.ROLES.FIELD_AGENT,
    exports.ROLES.BROKER,
];
//# sourceMappingURL=roles.js.map