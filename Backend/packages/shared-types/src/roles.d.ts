/**
 * RUIT CBE — Role Definitions
 * All system roles for RBAC
 */
export declare const ROLES: {
    readonly SUPER_ADMIN: "SUPER_ADMIN";
    readonly OPS_ADMIN: "OPS_ADMIN";
    readonly OPS_VIEWER: "OPS_VIEWER";
    readonly FINANCE_OPS: "FINANCE_OPS";
    readonly FLEET_OWNER: "FLEET_OWNER";
    readonly FLEET_MANAGER: "FLEET_MANAGER";
    readonly ORDERER: "ORDERER";
    readonly DRIVER: "DRIVER";
    readonly FIELD_AGENT: "FIELD_AGENT";
    readonly BROKER: "BROKER";
    readonly SYSTEM_SERVICE: "SYSTEM_SERVICE";
};
export type Role = (typeof ROLES)[keyof typeof ROLES];
export declare const USER_ROLES: Role[];
export declare const OPS_ROLES: Role[];
export declare const CLIENT_ROLES: Role[];
export interface AccessTokenPayload {
    sub: string;
    phone: string;
    role: Role;
    entityId: string;
    entityType: 'FLEET_OWNER' | 'ORDERER' | 'DRIVER' | null;
    jti: string;
    iat: number;
    exp: number;
}
//# sourceMappingURL=roles.d.ts.map