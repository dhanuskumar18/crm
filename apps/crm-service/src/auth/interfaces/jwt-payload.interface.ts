export interface JwtPayload {
  sub: string;        // User ID
  tenantId: string;   // Tenant ID
  roleId: string;     // Role ID
  roleName: string;   // Role Name
  email: string;      // User Email
}
