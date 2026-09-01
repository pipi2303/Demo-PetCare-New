import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AuditLog } from '../types';
import { INITIAL_USERS } from '../data/mockData';

export interface LoginOptions {
  branchId?: string;
  branchName?: string;
  ownershipType?: string;
}

export interface AuthContextType {
  user: User | null;
  users: User[];
  activeBranchId: string;
  setActiveBranchId: (branchId: string) => void;
  activeOwnership: string;
  setActiveOwnership: (ownership: string) => void;
  login: (emailOrPhone: string, pass: string, options?: LoginOptions) => Promise<{ success: boolean; message?: string }>;
  loginWithPin: (pin: string, branchId?: string) => { success: boolean; message?: string };
  loginAsUser: (targetUser: User, options?: LoginOptions) => void;
  loginAsDemoUser: (userId: string, branchId?: string) => void;
  switchRole: (role: UserRole) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoginScreenOpen: boolean;
  openLoginScreen: () => void;
  closeLoginScreen: () => void;
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
    // Default logged in as Owner Klinik for immediate exploration
    return INITIAL_USERS[0];
  });

  const [activeBranchId, setActiveBranchIdState] = useState<string>(() => {
    return localStorage.getItem('petcare_active_branch') || user?.branchId || 'b1';
  });

  const [activeOwnership, setActiveOwnershipState] = useState<string>(() => {
    return localStorage.getItem('petcare_active_ownership') || user?.ownershipType || 'owner_klinik';
  });

  const [isLoginScreenOpen, setIsLoginScreenOpen] = useState<boolean>(false);

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

  const login = async (emailOrPhone: string, pass: string, options?: LoginOptions): Promise<{ success: boolean; message?: string }> => {
    const cleanIdent = emailOrPhone.trim().toLowerCase();
    const found = INITIAL_USERS.find(
      (u) =>
        u.email.toLowerCase() === cleanIdent ||
        (u.phone && u.phone.replace(/\D/g, '') === cleanIdent.replace(/\D/g, '')) ||
        u.id.toLowerCase() === cleanIdent
    );

    if (found) {
      let passwordValid = false;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: found.email, password: pass })
        });
        const data = await res.json();
        passwordValid = !!data.success;
      } catch (e) {
        recordSecurityLog('Login', found.email, 'Gagal menghubungi server autentikasi saat login.', null, 'Kritis');
        return { success: false, message: 'Tidak dapat terhubung ke server autentikasi. Coba lagi.' };
      }

      if (!passwordValid) {
        recordSecurityLog(
          'Login',
          found.email,
          `Percobaan login gagal: kata sandi salah untuk ${found.email}`,
          null,
          'Warning'
        );
        return { success: false, message: 'Email, nomor HP, atau kata sandi tidak sesuai dengan database pengguna.' };
      }

      const branchIdToUse = options?.branchId || found.branchId || activeBranchId || 'b1';
      const ownershipToUse = options?.ownershipType || found.ownershipType || activeOwnership || 'owner_klinik';
      
      // If logging in as an owner or ownership is explicitly selected, synchronize role
      let roleToUse = found.role;
      if (ownershipToUse && (ownershipToUse === 'owner_klinik' || ownershipToUse === 'owner_petshop' || ownershipToUse === 'owner_petcare')) {
        if (found.role.startsWith('owner') || found.role === 'owner') {
          roleToUse = ownershipToUse as UserRole;
        }
      }

      const loggedUser: User = {
        ...found,
        role: roleToUse,
        branchId: branchIdToUse,
        branchName: options?.branchName || found.branchName,
        ownershipType: ownershipToUse
      };

      setUser(loggedUser);
      setActiveBranchId(branchIdToUse);
      setActiveOwnership(ownershipToUse);
      setIsLoginScreenOpen(false);

      recordSecurityLog(
        'Login',
        found.email,
        `Login berhasil untuk ${found.name} (${found.role}) di cabang ${branchIdToUse} dengan kepemilikan ${ownershipToUse}`,
        loggedUser,
        'Info',
        options?.branchName || found.branchName
      );
      return { success: true };
    }

    recordSecurityLog(
      'Login',
      emailOrPhone,
      `Percobaan login gagal dengan kredensial: ${emailOrPhone}`,
      null,
      'Warning'
    );
    return { success: false, message: 'Email, nomor HP, atau kata sandi tidak sesuai dengan database pengguna.' };
  };

  const loginWithPin = (pin: string, branchId?: string): { success: boolean; message?: string } => {
    const cleanPin = pin.trim();
    const found = INITIAL_USERS.find((u) => u.pin === cleanPin);

    if (found) {
      const branchIdToUse = branchId || found.branchId || activeBranchId || 'b1';
      const loggedUser: User = {
        ...found,
        branchId: branchIdToUse
      };

      setUser(loggedUser);
      setActiveBranchId(branchIdToUse);
      if (found.ownershipType) {
        setActiveOwnership(found.ownershipType);
      }
      setIsLoginScreenOpen(false);

      recordSecurityLog(
        'Login',
        `PIN: ${found.name}`,
        `Login cepat via PIN berhasil untuk staff ${found.name} (${found.role})`,
        loggedUser,
        'Info'
      );
      return { success: true };
    }

    recordSecurityLog(
      'Login',
      'PIN Otorisasi',
      `Percobaan login PIN gagal (${cleanPin})`,
      null,
      'Warning'
    );
    return { success: false, message: 'PIN otorisasi 4-digit tidak valid atau tidak terdaftar pada karyawan aktif.' };
  };

  const loginAsUser = (targetUser: User, options?: LoginOptions) => {
    const branchIdToUse = options?.branchId || targetUser.branchId || activeBranchId || 'b1';
    const ownershipToUse = options?.ownershipType || targetUser.ownershipType || activeOwnership || targetUser.role;
    
    let roleToUse = targetUser.role;
    if (ownershipToUse && (ownershipToUse === 'owner_klinik' || ownershipToUse === 'owner_petshop' || ownershipToUse === 'owner_petcare')) {
      if (targetUser.role.startsWith('owner') || targetUser.role === 'owner') {
        roleToUse = ownershipToUse as UserRole;
      }
    }

    const loggedUser: User = {
      ...targetUser,
      role: roleToUse,
      branchId: branchIdToUse,
      branchName: options?.branchName || targetUser.branchName,
      ownershipType: ownershipToUse
    };

    setUser(loggedUser);
    setActiveBranchId(branchIdToUse);
    setActiveOwnership(ownershipToUse);
    setIsLoginScreenOpen(false);

    recordSecurityLog(
      'Login',
      targetUser.name,
      `Otentikasi cepat profil: ${targetUser.name} (${roleToUse}) - Cabang: ${branchIdToUse} - Kepemilikan: ${ownershipToUse}`,
      loggedUser,
      'Info',
      options?.branchName || targetUser.branchName
    );
  };

  const loginAsDemoUser = (userId: string, branchId?: string) => {
    const found = INITIAL_USERS.find((u) => u.id === userId);
    if (found) {
      loginAsUser(found, { branchId });
    }
  };

  const switchRole = (role: UserRole) => {
    const found = INITIAL_USERS.find((u) => u.role === role);
    if (found) {
      loginAsUser(found, { ownershipType: role.startsWith('owner_') ? role : found.ownershipType });
      recordSecurityLog('Edit', 'Peran Otorisasi', `Mengalihkan profil aktif ke pengguna dengan peran: ${role.replace('_', ' ')} (${found.name})`, found, 'Warning');
    } else if (user) {
      const updatedOwnership = role.startsWith('owner_') ? role : user.ownershipType;
      const updated: User = { ...user, role, ownershipType: updatedOwnership };
      setUser(updated);
      if (role.startsWith('owner_')) {
        setActiveOwnership(role);
      }
      recordSecurityLog('Edit', 'Peran Otorisasi', `Mengubah hak akses aktif pengguna ${user.name} menjadi: ${role.replace('_', ' ')}`, updated, 'Warning');
    }
  };

  const logout = () => {
    if (user) {
      recordSecurityLog('Logout', user.name, `Pengguna ${user.name} (${user.role}) menutup sesi dan logout dari sistem.`, user, 'Info');
    }
    setUser(null);
    setIsLoginScreenOpen(true);
  };

  const openLoginScreen = () => setIsLoginScreenOpen(true);
  const closeLoginScreen = () => setIsLoginScreenOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        users: INITIAL_USERS,
        activeBranchId,
        setActiveBranchId,
        activeOwnership,
        setActiveOwnership,
        login,
        loginWithPin,
        loginAsUser,
        loginAsDemoUser,
        switchRole,
        logout,
        isAuthenticated: !!user,
        isLoginScreenOpen,
        openLoginScreen,
        closeLoginScreen
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


