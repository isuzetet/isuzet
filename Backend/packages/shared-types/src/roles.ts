/**
 * RUIT CBE — Role Definitions
 * All system roles for RBAC
 */

export const ROLES = {
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
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const USER_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.OPS_ADMIN,
  ROLES.OPS_VIEWER,
  ROLES.FINANCE_OPS,
  ROLES.FLEET_OWNER,
  ROLES.FLEET_MANAGER,
  ROLES.ORDERER,
  ROLES.DRIVER,
  ROLES.FIELD_AGENT,
  ROLES.BROKER,
];

export const OPS_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.OPS_ADMIN,
  ROLES.OPS_VIEWER,
  ROLES.FINANCE_OPS,
];

export const CLIENT_ROLES: Role[] = [
  ROLES.FLEET_OWNER,
  ROLES.FLEET_MANAGER,
  ROLES.ORDERER,
  ROLES.DRIVER,
  ROLES.FIELD_AGENT,
  ROLES.BROKER,
];

export interface AccessTokenPayload {
  sub: string; // user ID
  phone: string;
  role: Role;
  entityId: string; // fleet_owners.id, orderers.id, or drivers.id
  entityType: 'FLEET_OWNER' | 'ORDERER' | 'DRIVER' | null;
  jti: string; // JWT ID for revocation
  iat: number;
  exp: number;
}
