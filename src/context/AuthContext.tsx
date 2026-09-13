import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AuditLog } from '../types';
import { INITIAL_USERS } from '../data/mockData';
import { getAuthToken, setAuthToken, authHeaders } from '../utils/authToken';

export interface LoginOptions {
  branchId?: string;
  branchName?: string;
}

interface ServerAccount {
  email: string;
  name: string;
  role: UserRole;
  ownershipType?: string;
  branchId?: string;
  branchName?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  users: User[];
  activeBranchId: string;
  setActiveBranchId: (branchId: string) => void;
  activeOwnership: string;
  setActiveOwnership: (ownership: string) => void;
  login: (emailOrPhone: string, pass: string, options?: LoginOptions) => Promise<{ success: boolean; message?: string }>;
  loginWithPin: (pin: string, branchId?: string) => Promise<{ success: boolean; message?: string }>;
  switchAccount: (targetEmail: string, pin: string) => Promise<{ success: boolean; message?: string }>;
  findAccountEmailByRole: (role: UserRole) => string | null;
  logout: () => void;
  isAuthenticated: boolean;
  isLoginScreenOpen: boolean;
  openLoginScreen: () => void;
  closeLoginScreen: () => void;
  // Lock Aplikasi Otomatis — berbeda dari logout: sesi/token tetap ada,
  // hanya disembunyikan di balik LockScreen sampai unlock berhasil.
  isLocked: boolean;
  lockApp: () => void;
  unlockApp: (pin: string) => Promise<{ success: boolean; message?: string }>;
  changePin: (currentPassword: string, newPin: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to record security events in audit logs directly
export const recordSecurityLog = (
  action: AuditLog['action'],
  target: string,
  details: string,
  userSnapshot?: User | null,
  severity: 'Info' | 'Warning' | 'Kritis' = 'Info',
  branchName?: string
) => {
  try {
    const savedLogs = localStorage.getItem('petcare_audit_logs');
    let logs: AuditLog[] = savedLogs ? JSON.parse(savedLogs) : [];
    const newLog: AuditLog = {
      id: 'al_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userName: userSnapshot?.name || 'Sistem Keamanan',
      userRole: userSnapshot?.role || 'superadmin',
      action,
      module: 'Keamanan & Autentikasi',
      target,
      details,
      severity,
      branchName: branchName || userSnapshot?.branchName || 'Klinik Utama (Pusat)'
    };
    logs = [newLog, ...logs];
    localStorage.setItem('petcare_audit_logs', JSON.stringify(logs.slice(0, 500)));
  } catch (e) {
    // Ignore storage errors
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('petcare_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    // Default logged in as Owner Klinik for immediate exploration. Note: this
    // demo default carries NO session token, so any server action gated by
    // requireSession/requireRole (backup, WA, AI) will still demand a real
    // login — only local UI browsing is unauthenticated by default.
    return INITIAL_USERS[0];
  });

  // Server-issued session token. Kept in sync with localStorage via
  // authToken.ts so plain (non-React) utils can read it too.
  const [token, setToken] = useState<string | null>(() => getAuthToken());

  const [activeBranchId, setActiveBranchIdState] = useState<string>(() => {
    return localStorage.getItem('petcare_active_branch') || user?.branchId || 'b1';
  });

  const [activeOwnership, setActiveOwnershipState] = useState<string>(() => {
    return localStorage.getItem('petcare_active_ownership') || user?.ownershipType || 'owner_klinik';
  });

  const [isLoginScreenOpen, setIsLoginScreenOpen] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  const setActiveBranchId = (branchId: string) => {
    setActiveBranchIdState(branchId);
    localStorage.setItem('petcare_active_branch', branchId);
    if (user) {
      const updated = { ...user, branchId };
      setUser(updated);
    }
  };

  const setActiveOwnership = (ownership: string) => {
    setActiveOwnershipState(ownership);
    localStorage.setItem('petcare_active_ownership', ownership);
    if (user) {
      const updated = { ...user, ownershipType: ownership };
      setUser(updated);
    }
  };

  useEffect(() => {
    if (user) {
      localStorage.setItem('petcare_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('petcare_user');
    }
  }, [user]);

  // Apply a server-confirmed session: role/ownership/branch always come from
  // `account` (the server's own record), never from client-side guesses.
  // Cosmetic fields (avatar, phone, groupId, ...) are filled in from the
  // matching local directory entry when available, purely for display.
  const applySession = (
    newToken: string,
    account: ServerAccount,
    opts?: { branchId?: string; branchName?: string; logMessage: string }
  ) => {
    const directoryMatch = INITIAL_USERS.find((u) => u.email.toLowerCase() === account.email.toLowerCase());
    const branchIdToUse = opts?.branchId || account.branchId || activeBranchId || 'b1';
    const ownershipToUse = account.ownershipType || activeOwnership || 'owner_klinik';

    const loggedUser: User = {
      ...(directoryMatch || {}),
      id: directoryMatch?.id || account.email,
      name: account.name,
      email: account.email,
      role: account.role,
      active: true,
      branchId: branchIdToUse,
      branchName: opts?.branchName || account.branchName,
      ownershipType: ownershipToUse
    };

    setToken(newToken);
    setAuthToken(newToken);
    setUser(loggedUser);
    // Deliberately NOT calling setActiveBranchId/setActiveOwnership here —
    // both read `user` from their own closure and merge onto it, which
    // would race against the setUser() above (still the PREVIOUS user at
    // this point) and clobber the just-applied session. branchId/ownership
    // are already correct inside loggedUser, so just mirror the plain
    // state + localStorage bookkeeping directly.
    setActiveBranchIdState(branchIdToUse);
    localStorage.setItem('petcare_active_branch', branchIdToUse);
    setActiveOwnershipState(ownershipToUse);
    localStorage.setItem('petcare_active_ownership', ownershipToUse);
    setIsLoginScreenOpen(false);

    recordSecurityLog('Login', account.email, opts?.logMessage || `Sesi aktif untuk ${account.name} (${account.role})`, loggedUser, 'Info', branchIdToUse);
  };

  const login = async (emailOrPhone: string, pass: string, options?: LoginOptions): Promise<{ success: boolean; message?: string }> => {
    const cleanIdent = emailOrPhone.trim().toLowerCase();
    // Client only resolves an identifier -> email for convenience (phone/id
    // login); the server independently re-verifies the password and is the
    // sole source of the resulting role/ownership.
    const found = INITIAL_USERS.find(
      (u) =>
        u.email.toLowerCase() === cleanIdent ||
        (u.phone && u.phone.replace(/\D/g, '') === cleanIdent.replace(/\D/g, '')) ||
        u.id.toLowerCase() === cleanIdent
    );
    const emailToTry = found?.email || emailOrPhone;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToTry, password: pass })
      });
      const data = await res.json();

      if (!data.success) {
        recordSecurityLog('Login', emailToTry, `Percobaan login gagal untuk ${emailToTry}`, null, 'Warning');
        return { success: false, message: data.message || 'Email, nomor HP, atau kata sandi tidak sesuai.' };
      }

      applySession(data.token, data.account, {
        branchId: options?.branchId,
        branchName: options?.branchName,
        logMessage: `Login berhasil untuk ${data.account.name} (${data.account.role})`
      });
      return { success: true };
    } catch (e) {
      recordSecurityLog('Login', emailToTry, 'Gagal menghubungi server autentikasi saat login.', null, 'Kritis');
      return { success: false, message: 'Tidak dapat terhubung ke server autentikasi. Coba lagi.' };
    }
  };

  const loginWithPin = async (pin: string, branchId?: string): Promise<{ success: boolean; message?: string }> => {
    const cleanPin = pin.trim();
    try {
      const res = await fetch('/api/auth/login-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleanPin })
      });
      const data = await res.json();

      if (!data.success) {
        recordSecurityLog('Login', 'PIN Otorisasi', `Percobaan login PIN gagal`, null, 'Warning');
        return { success: false, message: data.message || 'PIN otorisasi 4-digit tidak valid atau tidak terdaftar.' };
      }

      applySession(data.token, data.account, {
        branchId,
        logMessage: `Login cepat via PIN berhasil untuk staff ${data.account.name} (${data.account.role})`
      });
      return { success: true };
    } catch (e) {
      recordSecurityLog('Login', 'PIN Otorisasi', 'Gagal menghubungi server autentikasi saat login PIN.', null, 'Kritis');
      return { success: false, message: 'Tidak dapat terhubung ke server autentikasi. Coba lagi.' };
    }
  };

  // Switch the active session to a different demo persona/account. Requires
  // the CURRENT session to still be valid, plus the TARGET account's own
  // PIN — verified server-side. This replaces the old one-click `switchRole`
  // that could impersonate any account with zero credentials.
  const switchAccount = async (targetEmail: string, pin: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/switch-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ targetEmail, pin: pin.trim() })
      });
      const data = await res.json();

      if (!data.success) {
        recordSecurityLog('Edit', 'Peran Otorisasi', `Percobaan ganti akun ke ${targetEmail} gagal (PIN salah atau sesi tidak valid).`, user, 'Warning');
        return { success: false, message: data.message || 'PIN tidak sesuai untuk akun tujuan.' };
      }

      applySession(data.token, data.account, {
        logMessage: `Mengalihkan profil aktif ke ${data.account.name} (${data.account.role})`
      });
      return { success: true };
    } catch (e) {
      return { success: false, message: 'Tidak dapat terhubung ke server autentikasi. Coba lagi.' };
    }
  };

  // Lock Aplikasi Otomatis — kunci sesi tanpa logout (token/state tetap).
  const lockApp = () => {
    if (!user || isLocked) return;
    setIsLocked(true);
    recordSecurityLog('Edit', user.name, `Aplikasi otomatis terkunci (idle) untuk sesi ${user.name} (${user.role}).`, user, 'Info');
  };

  // Unlock HANYA menerima PIN milik user yang sedang login — verifikasi
  // memakai endpoint switch-account yang sudah ada, ditarget ke email user
  // aktif sendiri, jadi PIN staf lain otomatis ditolak server (401).
  const unlockApp = async (pin: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: 'Tidak ada sesi aktif untuk dibuka.' };
    const result = await switchAccount(user.email, pin);
    if (result.success) {
      setIsLocked(false);
      recordSecurityLog('Login', user.name, `Aplikasi berhasil dibuka kembali (unlock) oleh ${user.name}.`, user, 'Info');
    } else {
      recordSecurityLog('Login', user.name, `Percobaan unlock aplikasi gagal untuk ${user.name} (PIN salah).`, user, 'Warning');
    }
    return result;
  };

  // Ganti PIN akun yang sedang login. Target email selalu dari sesi
  // server-side (backend membaca req.session.email, bukan dari body) —
  // frontend tidak perlu (dan tidak bisa) mengganti PIN akun lain.
  const changePin = async (currentPassword: string, newPin: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ currentPassword, newPin })
      });
      const data = await res.json();
      if (!data.success) {
        recordSecurityLog('Edit', 'PIN Otorisasi', `Percobaan ganti PIN gagal untuk ${user?.email || 'akun tidak diketahui'}.`, user, 'Warning');
        return { success: false, message: data.message || 'Gagal mengganti PIN.' };
      }
      recordSecurityLog('Edit', 'PIN Otorisasi', `PIN berhasil diganti untuk ${user?.name || user?.email}.`, user, 'Kritis');
      return { success: true };
    } catch (e) {
      return { success: false, message: 'Tidak dapat terhubung ke server autentikasi. Coba lagi.' };
    }
  };

  // Directory-only lookup (name/email/role, no secrets) so UI can show which
  // persona a "quick switch" button targets before the PIN is entered.
  const findAccountEmailByRole = (role: UserRole): string | null => {
    const found = INITIAL_USERS.find((u) => u.role === role) || INITIAL_USERS.find((u) => u.ownershipType === role);
    return found?.email || null;
  };

  const logout = () => {
    if (user) {
      recordSecurityLog('Logout', user.name, `Pengguna ${user.name} (${user.role}) menutup sesi dan logout dari sistem.`, user, 'Info');
    }
    if (token) {
      fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() }).catch(() => {});
    }
    setToken(null);
    setAuthToken(null);
    setUser(null);
    setIsLoginScreenOpen(true);
    setIsLocked(false);
  };

  const openLoginScreen = () => setIsLoginScreenOpen(true);
  const closeLoginScreen = () => setIsLoginScreenOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        users: INITIAL_USERS,
        activeBranchId,
        setActiveBranchId,
        activeOwnership,
        setActiveOwnership,
        login,
        loginWithPin,
        switchAccount,
        findAccountEmailByRole,
        logout,
        isAuthenticated: !!user,
        isLoginScreenOpen,
        openLoginScreen,
        closeLoginScreen,
        isLocked,
        lockApp,
        unlockApp,
        changePin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
