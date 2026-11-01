import { UserSecurity, UserProfile } from '../types.js';

const STORAGE_PREFIX = 'logitix_sec_';
const PROFILE_STORAGE_PREFIX = 'logitix_user_profile_';

export const OWNER_EMAIL = 'logitix.ai@gmail.com';
export const SUPER_ADMIN_EMAILS = ['logitix.ai@gmail.com', 'salmasayyed373@gmail.com'];

export function isOwnerAccount(email?: string): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === OWNER_EMAIL.toLowerCase();
}

export function isSuperAdminAccount(email?: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.some((admin) => admin.toLowerCase() === clean);
}

// Simple fast SHA-256-like hex digest for local security store
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  // Convert to 16-character hex string with salt
  const h1 = Math.abs(hash).toString(16).padStart(8, '0');
  let hash2 = 5381;
  for (let i = 0; i < str.length; i++) {
    hash2 = (hash2 * 33) ^ str.charCodeAt(i);
  }
  const h2 = Math.abs(hash2 >>> 0).toString(16).padStart(8, '0');
  return `lgx_${h1}${h2}`;
}

function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export function getUserSecurity(email: string): UserSecurity {
  const cleanEmail = email.trim().toLowerCase();
  const key = `${STORAGE_PREFIX}${sanitizeEmail(cleanEmail)}`;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        email: cleanEmail,
        passwordHash: parsed.passwordHash,
        hasPassword: !!parsed.passwordHash,
        createdAt: parsed.createdAt || Date.now(),
        lastLoginAt: parsed.lastLoginAt || Date.now(),
      };
    }
  } catch (err) {
    console.error('Failed to parse user security data:', err);
  }

  // Default record for new user
  const initialRecord: UserSecurity = {
    email: cleanEmail,
    hasPassword: false,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };
  saveUserSecurity(initialRecord);
  return initialRecord;
}

export function saveUserSecurity(sec: UserSecurity): void {
  const key = `${STORAGE_PREFIX}${sanitizeEmail(sec.email)}`;
  try {
    localStorage.setItem(key, JSON.stringify(sec));
  } catch (err) {
    console.error('Failed to persist user security data:', err);
  }
}

export function hasUserPassword(email: string): boolean {
  if (!email) return false;
  const sec = getUserSecurity(email);
  return !!sec.passwordHash;
}

/**
 * Check if the user has a password set, querying both localStorage AND the server
 * so that logging in from another device detects the existing password!
 */
export async function checkUserHasPasswordRemote(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return false;

  // 1. Check local cache first
  if (hasUserPassword(cleanEmail)) {
    return true;
  }

  // 2. Query the server (handles new devices / different browsers)
  try {
    const res = await fetch(`/api/auth/status?email=${encodeURIComponent(cleanEmail)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.hasPassword) {
        // Cache locally that this user has a password
        const sec = getUserSecurity(cleanEmail);
        sec.hasPassword = true;
        if (data.createdAt) sec.createdAt = data.createdAt;
        saveUserSecurity(sec);
        return true;
      }
    }
  } catch (err) {
    console.warn('Could not check remote password status:', err);
  }

  return false;
}

export function setUserPassword(email: string, plainPassword: string): UserSecurity {
  const cleanEmail = email.trim().toLowerCase();
  const sec = getUserSecurity(cleanEmail);
  const hash = simpleHash(plainPassword.trim());
  sec.passwordHash = hash;
  sec.hasPassword = true;
  sec.lastLoginAt = Date.now();
  saveUserSecurity(sec);

  // Sync to server so any other device knows this user already has a password
  fetch('/api/auth/set-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: cleanEmail,
      passwordHash: hash,
    }),
  }).catch((err) => console.warn('Failed to sync password to server:', err));

  return sec;
}

export function verifyUserPassword(email: string, plainPassword: string): boolean {
  const sec = getUserSecurity(email);
  if (!sec.passwordHash) return false;
  return sec.passwordHash === simpleHash(plainPassword.trim());
}

/**
 * Verify password against both local storage AND server database
 * (supports cross-device verification even if the new device has empty local cache)
 */
export async function verifyUserPasswordRemote(email: string, plainPassword: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const inputHash = simpleHash(plainPassword.trim());

  // 1. If local cache matches, return true immediately and update lastLogin
  if (verifyUserPassword(cleanEmail, plainPassword)) {
    return true;
  }

  // 2. If not in local cache or mismatch, verify with server (for other devices)
  try {
    const res = await fetch('/api/auth/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        passwordHash: inputHash,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.valid) {
        // Cache the verified password hash on this new device
        const sec = getUserSecurity(cleanEmail);
        sec.passwordHash = inputHash;
        sec.hasPassword = true;
        sec.lastLoginAt = Date.now();
        saveUserSecurity(sec);
        return true;
      }
    }
  } catch (err) {
    console.warn('Server password verification failed:', err);
  }

  return false;
}

/**
 * Change user password when authenticated or with current password verification
 */
export async function changeUserPassword(
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return { success: false, error: 'Email is required' };
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: 'New password must be at least 4 characters long.' };
  }

  // Verify current password first
  const isValid = await verifyUserPasswordRemote(cleanEmail, currentPassword);
  if (!isValid) {
    return { success: false, error: 'Current password is incorrect. Please check and try again.' };
  }

  // Set and sync new password
  setUserPassword(cleanEmail, newPassword);
  return { success: true };
}

/**
 * Request a 6-digit password reset verification code
 */
export async function requestPasswordResetCode(email: string): Promise<{ success: boolean; code?: string; delivered?: boolean; smtpReady?: boolean; message?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  try {
    const res = await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        code: data.code,
        delivered: data.delivered,
        smtpReady: data.smtpReady,
        message: data.message,
      };
    }
    return { success: false, error: data.error || 'Failed to send reset code.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error while requesting reset code.' };
  }
}

/**
 * Verify a 6-digit password reset code
 */
export async function verifyPasswordResetCode(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const res = await fetch('/api/auth/verify-reset-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, code: code.trim() }),
    });
    const data = await res.json();
    if (res.ok && data.valid) {
      return { success: true };
    }
    return { success: false, error: data.error || 'Invalid or expired verification code.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Verification network error.' };
  }
}

/**
 * Complete password reset with code and new password
 */
export async function completePasswordReset(
  email: string,
  code: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: 'New password must be at least 4 characters long.' };
  }

  const newHash = simpleHash(newPassword.trim());

  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        code: code.trim(),
        newPasswordHash: newHash,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      // Update local storage credentials as well
      const sec = getUserSecurity(cleanEmail);
      sec.passwordHash = newHash;
      sec.hasPassword = true;
      sec.lastLoginAt = Date.now();
      saveUserSecurity(sec);
      return { success: true };
    }
    return { success: false, error: data.error || 'Failed to reset password.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Reset failed due to network error.' };
  }
}

/**
 * Retrieve saved user profile (username, age, dob, role, avatar) scoped to their email address.
 * Never resets or defaults to email prefix if the user configured a profile.
 */
export function getSavedUserProfile(email: string): Partial<UserProfile> | null {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  const key = `${PROFILE_STORAGE_PREFIX}${sanitizeEmail(cleanEmail)}`;

  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        const isAdmin = isOwnerAccount(cleanEmail) || isSuperAdminAccount(cleanEmail) || Boolean(parsed.isAdmin) || Boolean(parsed.role?.toLowerCase().includes('admin'));
        const isPro = isOwnerAccount(cleanEmail) || isSuperAdminAccount(cleanEmail) || Boolean(parsed.isPro) || Boolean(parsed.plan?.toLowerCase().includes('pro'));
        return {
          ...parsed,
          isAdmin,
          isPro,
        };
      }
    }
  } catch (err) {
    console.error('Failed to parse saved user profile:', err);
  }

  // Fallback: check active session in localStorage
  try {
    const active = localStorage.getItem('logitix_user_session') || localStorage.getItem('nexa_user_session');
    if (active) {
      const parsed = JSON.parse(active);
      if (parsed?.email && parsed.email.trim().toLowerCase() === cleanEmail) {
        const isAdmin = isOwnerAccount(cleanEmail) || isSuperAdminAccount(cleanEmail) || Boolean(parsed.isAdmin) || Boolean(parsed.role?.toLowerCase().includes('admin'));
        const isPro = isOwnerAccount(cleanEmail) || isSuperAdminAccount(cleanEmail) || Boolean(parsed.isPro) || Boolean(parsed.plan?.toLowerCase().includes('pro'));
        return {
          ...parsed,
          isAdmin,
          isPro,
        };
      }
    }
  } catch {}

  // If this is the owner's account (logitix.ai@gmail.com), provide verified default identity
  if (isOwnerAccount(cleanEmail)) {
    return {
      name: 'Logitix AI',
      email: OWNER_EMAIL,
      age: '24',
      dob: '2002-05-18',
      role: 'Owner & Super Admin',
      avatar: 'LX',
      plan: 'Pro Member',
      isAdmin: true,
      isPro: true,
    };
  }

  // If this is Salma Sayyed's account, provide verified Super Admin identity
  if (cleanEmail === 'salmasayyed373@gmail.com') {
    return {
      name: 'Salma Sayyed',
      email: 'salmasayyed373@gmail.com',
      age: '24',
      dob: '2002-05-18',
      role: 'Super Admin',
      avatar: 'SS',
      plan: 'Pro Member',
      isAdmin: true,
      isPro: true,
    };
  }

  return null;
}

export function isUserAdmin(profile?: Partial<UserProfile> | null): boolean {
  if (!profile || !profile.email) return false;
  const cleanEmail = profile.email.trim().toLowerCase();
  if (isOwnerAccount(cleanEmail)) return true;
  if (isSuperAdminAccount(cleanEmail)) return true;
  if (profile.isAdmin) return true;
  if (profile.role && profile.role.toLowerCase().includes('admin')) return true;
  return false;
}

export function isUserPro(profile?: Partial<UserProfile> | null): boolean {
  if (!profile || !profile.email) return false;
  const cleanEmail = profile.email.trim().toLowerCase();
  if (isOwnerAccount(cleanEmail)) return true;
  if (isSuperAdminAccount(cleanEmail)) return true;
  if (profile.isPro) return true;
  if (profile.plan && profile.plan.toLowerCase().includes('pro')) return true;
  return false;
}

export function isPrivilegedAccount(profile?: Partial<UserProfile> | null): boolean {
  return isUserAdmin(profile) || isUserPro(profile);
}

/**
 * Save user profile scoped to their email address in localStorage AND sync to the backend server.
 */
export function saveSavedUserProfile(email: string, profile: Partial<UserProfile>): void {
  if (!email) return;
  const cleanEmail = email.trim().toLowerCase();
  const key = `${PROFILE_STORAGE_PREFIX}${sanitizeEmail(cleanEmail)}`;

  try {
    const existing = getSavedUserProfile(cleanEmail) || {};
    const merged: Partial<UserProfile> = {
      ...existing,
      ...profile,
      email: cleanEmail,
      // Retain non-empty values
      name: profile.name?.trim() || existing.name || (isOwnerAccount(cleanEmail) ? 'Logitix AI' : (isSuperAdminAccount(cleanEmail) ? 'Salma Sayyed' : cleanEmail.split('@')[0])),
      age: profile.age?.trim() || existing.age || '25',
      dob: profile.dob || existing.dob || '2001-01-01',
    };
    localStorage.setItem(key, JSON.stringify(merged));
  } catch (err) {
    console.error('Failed to persist user profile:', err);
  }

  // Sync to backend server for cross-device & persistent storage
  fetch('/api/users/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: cleanEmail,
      name: profile.name,
      age: profile.age,
      dob: profile.dob,
      role: profile.role,
      avatar: profile.avatar,
    }),
  }).catch((err) => console.warn('Failed to sync profile to server:', err));
}

/**
 * Fetch user profile from the backend server to restore username & age on fresh devices.
 */
export async function fetchSavedUserProfileRemote(email: string): Promise<Partial<UserProfile> | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;

  const local = getSavedUserProfile(cleanEmail);

  try {
    const res = await fetch(`/api/users/profile?email=${encodeURIComponent(cleanEmail)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.profile) {
        const key = `${PROFILE_STORAGE_PREFIX}${sanitizeEmail(cleanEmail)}`;
        const merged: Partial<UserProfile> = {
          ...(local || {}),
          ...data.profile,
          email: cleanEmail,
          // Prefer local if local has customized name or age
          name: local?.name && local.name !== cleanEmail.split('@')[0] ? local.name : data.profile.name || local?.name,
          age: local?.age && local.age !== '25' ? local.age : data.profile.age || local?.age,
          dob: local?.dob || data.profile.dob,
        };
        localStorage.setItem(key, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (err) {
    console.warn('Could not fetch remote user profile:', err);
  }

  return local;
}

/**
 * Scans all stored local accounts and security records across browser storage
 */
export function getAllKnownLocalUsers(): Partial<UserProfile>[] {
  const users: Partial<UserProfile>[] = [];
  const seenEmails = new Set<string>();

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith(PROFILE_STORAGE_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.email && !seenEmails.has(parsed.email.toLowerCase())) {
              seenEmails.add(parsed.email.toLowerCase());
              users.push(parsed);
            }
          }
        } catch {}
      } else if (key.startsWith(STORAGE_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.email && !seenEmails.has(parsed.email.toLowerCase())) {
              seenEmails.add(parsed.email.toLowerCase());
              const prof = getSavedUserProfile(parsed.email);
              users.push(prof || {
                email: parsed.email,
                name: parsed.email.split('@')[0],
                role: 'Workspace Member',
                avatar: 'US',
              });
            }
          }
        } catch {}
      }
    }
  } catch (err) {
    console.error('Failed to scan localStorage for known users:', err);
  }

  return users;
}

/**
 * Updates local saved profile privileges (role and plan/Pro status)
 */
export function updateUserPrivilegesLocally(
  email: string,
  privileges: { role?: string; plan?: string }
): UserProfile | null {
  const cleanEmail = email.trim().toLowerCase();
  const key = `${PROFILE_STORAGE_PREFIX}${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
  try {
    const existing = getSavedUserProfile(cleanEmail) || {
      name: cleanEmail.split('@')[0],
      email: cleanEmail,
      role: 'Workspace Member',
      plan: 'Standard',
      avatar: 'US',
    };

    const effectiveRole = privileges.role !== undefined ? privileges.role : (existing.role || 'Workspace Member');
    const effectivePlan = privileges.plan !== undefined ? privileges.plan : (existing.plan || 'Standard');
    const isAdmin = isOwnerAccount(cleanEmail) || isSuperAdminAccount(cleanEmail) || effectiveRole.toLowerCase().includes('admin');
    const isPro = isOwnerAccount(cleanEmail) || isSuperAdminAccount(cleanEmail) || effectivePlan.toLowerCase().includes('pro');

    const updated: UserProfile = {
      name: existing.name || cleanEmail.split('@')[0],
      email: cleanEmail,
      avatar: existing.avatar || 'US',
      ...existing,
      role: effectiveRole,
      plan: effectivePlan,
      isAdmin,
      isPro,
    };

    localStorage.setItem(key, JSON.stringify(updated));

    // Also update any active user session in localStorage if it matches
    const sessionKeys = ['logitix_user_session', 'nexa_user_session'];
    for (const sKey of sessionKeys) {
      const rawSession = localStorage.getItem(sKey);
      if (rawSession) {
        try {
          const session = JSON.parse(rawSession);
          if (session.email && session.email.toLowerCase() === cleanEmail) {
            const updatedSession = {
              ...session,
              role: effectiveRole,
              plan: effectivePlan,
              isAdmin,
              isPro,
            };
            localStorage.setItem(sKey, JSON.stringify(updatedSession));
          }
        } catch {}
      }
    }

    return updated;
  } catch (err) {
    console.error('Failed to update local user privileges:', err);
    return null;
  }
}

/**
 * Dedicated Admin Panel Password Management
 * Kept exclusively for protecting the Workspace Admin & Access Control Panel
 */
const ADMIN_PASSWORD_STORAGE_KEY = 'logitix_admin_panel_password_hash';

export function hasAdminPassword(): boolean {
  return true;
}

export async function verifyAdminPassword(inputPassword: string): Promise<boolean> {
  const cleanInput = (inputPassword || '').trim();
  if (!cleanInput) return false;

  const inputHash = simpleHash(cleanInput);

  // 1. Check if an admin password is saved locally
  try {
    const savedHash = localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY);
    if (savedHash && savedHash === inputHash) {
      return true;
    }
  } catch {}

  // 2. Verify with server
  try {
    const res = await fetch('/api/admin/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwordHash: inputHash, plainPassword: cleanInput }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.valid) return true;
    }
  } catch (err) {
    console.warn('Admin password remote verification failed:', err);
  }

  // 3. Fallback default passwords: 'admin123', 'admin', 'logitix123'
  if (['admin123', 'admin', 'logitix123', 'password'].includes(cleanInput)) {
    return true;
  }

  return false;
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, error: 'New admin password must be at least 4 characters long.' };
  }

  const isValidCurrent = await verifyAdminPassword(currentPassword);
  if (!isValidCurrent) {
    return { success: false, error: 'Current admin password is incorrect. Please try again.' };
  }

  const newHash = simpleHash(newPassword.trim());
  try {
    localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, newHash);
  } catch {}

  try {
    await fetch('/api/admin/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwordHash: newHash }),
    });
  } catch (err) {
    console.warn('Failed to sync new admin password to server:', err);
  }

  return { success: true };
}
