import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  tenantId: string;
  userId?: string;
}

export const tenantContextStorage = new AsyncLocalStorage<TenantStore>();

export function getTenantId(): string | undefined {
  const store = tenantContextStorage.getStore();
  return store?.tenantId;
}

export function getUserId(): string | undefined {
  const store = tenantContextStorage.getStore();
  return store?.userId;
}
