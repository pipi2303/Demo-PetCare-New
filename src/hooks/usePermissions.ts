import { useAuth } from '../context/AuthContext';
import { MODULE_PERMISSIONS, NavModule } from '../components/layout/Sidebar';
import { UserRole } from '../types';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';

const OWNER_FLAVORS = ['owner_klinik', 'owner_petshop', 'owner_petcare'];

/**
 * Single source of truth for "what can the current session do" — replaces
 * the three divergent effectiveRole/isPetshop implementations that used to
 * live separately in Sidebar.tsx, App.tsx, and DashboardModule.tsx (which
 * could disagree with each other).
 *
 * `role` only falls back from the account's own (server-verified) role to
 * ownershipType/activeOwnership when the role itself is missing or the
 * generic 'owner' placeholder — a concrete role like 'dokter' or 'kasir'
 * must never be silently upgraded to an owner role just because the
 * account's ownershipType happens to be an owner flavor.
 */
export function usePermissions() {
  const { user, activeOwnership } = useAuth();

  let role: UserRole = user?.role || 'owner_klinik';
  if ((role === 'owner' || !user) && user?.ownershipType && OWNER_FLAVORS.includes(user.ownershipType)) {
    role = user.ownershipType as UserRole;
  } else if (!user && activeOwnership && OWNER_FLAVORS.includes(activeOwnership)) {
    role = activeOwnership as UserRole;
  }

  const isPetshop = role === 'owner_petshop' || role === 'kasir';
  const isClinic = role === 'owner_klinik' || role === 'dokter' || role === 'perawat';
  const isPetcare = !isPetshop && !isClinic;

  const canAccessModule = (moduleId: NavModule | string): boolean => {
    const allowed = MODULE_PERMISSIONS[moduleId as NavModule];
    if (!allowed) return false;
    return allowed.includes('*') || allowed.includes(role);
  };

  const can = (moduleId: string, _action: PermissionAction = 'view'): boolean => canAccessModule(moduleId);

  return { role, isPetshop, isClinic, isPetcare, canAccessModule, can };
}
