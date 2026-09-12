import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
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
  const { systemGroups = [] } = useData();

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

  const group = user?.groupId ? systemGroups.find((g) => g.id === user.groupId) : undefined;

  /**
   * Module-level access is checked first (from MODULE_PERMISSIONS). If the
   * user's SystemGroup additionally defines a granular entry for this
   * module, that entry narrows the specific action further — this is what
   * makes SystemGroupsModule's permission matrix actually mean something,
   * instead of being purely decorative.
   */
  const can = (moduleId: string, action: PermissionAction = 'view'): boolean => {
    if (!canAccessModule(moduleId)) return false;
    const entry = group?.modulePermissions.find((p) => p.moduleId === moduleId);
    // Fail-closed: kalau grup pengguna tidak punya entri eksplisit untuk
    // modul ini, TOLAK aksi granular (create/edit/delete/approve) — bukan
    // izinkan. Sebelumnya di sini `return true`, artinya grup akses baru
    // yang cuma di-seed 2-3 modul otomatis dapat akses PENUH ke SEMUA modul
    // lain yang tidak terdaftar (termasuk hrm & masterData) — kebalikan dari
    // maksud "grup terbatas".
    if (!entry) return false;
    switch (action) {
      case 'view':
        return entry.canView;
      case 'create':
        return entry.canCreate;
      case 'edit':
        return entry.canEdit;
      case 'delete':
        return entry.canDelete;
      case 'approve':
        return entry.canApprove ?? entry.canEdit;
      default:
        return false;
    }
  };

  return { role, isPetshop, isClinic, isPetcare, canAccessModule, can };
}
