import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Cpu, Sparkles, Check, GitCommit, Tag, Info, User, Calendar, Hash, Shield, Trash2, UserX, UserCheck, Plus, Lock, Unlock, Mail, RefreshCw, AlertCircle, Eye, EyeOff, ShieldCheck, KeyRound, Send, CheckCircle2, RotateCcw, Loader2, Crown, ShieldAlert, Search, X, AlertTriangle } from 'lucide-react';
import { DateOfBirthPicker } from './DateOfBirthPicker.js';
import { AIProvider, UserProfile } from '../types.js';
import { APP_VERSION, SEMVER_GUIDELINES } from '../version.js';
import { hasUserPassword, verifyUserPassword, saveSavedUserProfile, changeUserPassword, requestPasswordResetCode, completePasswordReset, isOwnerAccount, isSuperAdminAccount, getAllKnownLocalUsers, updateUserPrivilegesLocally, verifyAdminPassword, changeAdminPassword } from '../core/security.js';
import { getUserRoleTier } from '../core/quota.js';

interface SettingsViewProps {
  userProfile?: UserProfile;
  onUpdateProfile?: (updated: UserProfile) => void;
  darkMode?: boolean;
  activeModel?: string;
  onSelectModel?: (model: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  userProfile, 
  onUpdateProfile, 
  darkMode = false,
  activeModel,
  onSelectModel,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');
  const [selectedModel, setSelectedModel] = useState(activeModel || 'gemini-3.1-flash-lite');

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem('logitix_active_model', model);
    if (onSelectModel) {
      onSelectModel(model);
    }
  };

  // User Profile Account
  const userEmail = userProfile?.email?.trim().toLowerCase() || '';

  // Dedicated Admin Panel Password Protection State
  // Password is ONLY required for administrative panel access and actions
  const [isAdminPanelUnlocked, setIsAdminPanelUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminPasswordInput, setShowAdminPasswordInput] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [adminAuthLoading, setAdminAuthLoading] = useState(false);

  // Admin Master Password Management Modal State
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [currentAdminPasswordInput, setCurrentAdminPasswordInput] = useState('');
  const [newAdminPasswordInput, setNewAdminPasswordInput] = useState('');
  const [confirmAdminPasswordInput, setConfirmAdminPasswordInput] = useState('');
  const [showCurrentAdminPwd, setShowCurrentAdminPwd] = useState(false);
  const [showNewAdminPwd, setShowNewAdminPwd] = useState(false);
  const [adminPasswordChangeLoading, setAdminPasswordChangeLoading] = useState(false);
  const [adminPasswordChangeError, setAdminPasswordChangeError] = useState<string | null>(null);
  const [adminPasswordChangeSuccess, setAdminPasswordChangeSuccess] = useState<string | null>(null);

  // Profile Form States
  const [nameInput, setNameInput] = useState(userProfile?.name || 'Executive Member');
  const [ageInput, setAgeInput] = useState(userProfile?.age || '25');
  const [dobInput, setDobInput] = useState(userProfile?.dob || '2000-01-01');
  const [roleInput, setRoleInput] = useState(userProfile?.role || 'Pro Executive');

  // User Management State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [bannedEmails, setBannedEmails] = useState<string[]>([]);
  const [manualBanEmail, setManualBanEmail] = useState('');
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [userMgmtLoading, setUserMgmtLoading] = useState(false);
  const [userMgmtMsg, setUserMgmtMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Helper for user management toast / notification banner
  const notifyUserMgmt = (text: string, isError = false, duration = 4500) => {
    setUserMgmtMsg({ text, isError });
    setTimeout(() => setUserMgmtMsg(null), duration);
  };

  // Owner Privilege Quick-Assign State
  const [assignEmailInput, setAssignEmailInput] = useState('');
  const [assignMakePro, setAssignMakePro] = useState(true);
  const [assignMakeAdmin, setAssignMakeAdmin] = useState(false);

  // Super Admin, Owner & Admin Access Control
  const isOwner = isOwnerAccount(userProfile?.email);
  const isSuperAdmin = isSuperAdminAccount(userProfile?.email);
  const isSuperAdminOwner = isOwner || isSuperAdmin;
  const userRoleTier = getUserRoleTier(userProfile);
  const isAdmin = isSuperAdminOwner || userRoleTier === 'Admin' || Boolean(userProfile?.isAdmin) || Boolean(userProfile?.role && userProfile.role.toLowerCase().includes('admin'));

  // User Requirement: "the admins should have access to view the access panel but can't change anything"
  const canViewAccessPanel = isOwner || isSuperAdmin || isAdmin;
  const canModifyAccess = isOwner || isSuperAdmin;
  const isReadOnlyAdmin = isAdmin && !canModifyAccess;

  const filteredUsersList = useMemo(() => {
    if (!accountSearchQuery.trim()) return usersList;
    const q = accountSearchQuery.toLowerCase().trim();
    return usersList.filter((u) => {
      return (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        (u.plan && u.plan.toLowerCase().includes(q)) ||
        (u.status && u.status.toLowerCase().includes(q))
      );
    });
  }, [usersList, accountSearchQuery]);

  const fetchUsers = async () => {
    setUserMgmtLoading(true);
    try {
      // 1. Gather all local accounts known in browser storage
      const localUsers = getAllKnownLocalUsers();
      if (userProfile?.email) {
        localUsers.push(userProfile);
      }

      // 2. Sync local accounts with server so all accounts appear
      if (localUsers.length > 0) {
        await fetch('/api/users/sync-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ localUsers }),
        }).catch(() => null);
      }

      // Signal heartbeat for current logged-in user so they are recognized as active
      if (userProfile?.email) {
        await fetch('/api/users/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userProfile.email }),
        }).catch(() => null);
      }

      // 3. Fetch full merged list with real-time active status
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) {
        const processedUsers = data.users.map((u: any) => {
          const isCurrentSessionUser = userProfile?.email?.toLowerCase() === u.email.toLowerCase();
          const isBanned = u.isBanned || (data.bannedEmails && data.bannedEmails.includes(u.email.toLowerCase()));
          // Account is active ONLY if not banned AND currently active in this browser tab OR reporting server heartbeat
          const isActive = isBanned ? false : (isCurrentSessionUser || Boolean(u.isActive || u.isOnline));
          const status = isBanned ? 'BANNED' : (isActive ? 'ACTIVE' : 'INACTIVE');
          const isUserOwner = isOwnerAccount(u.email);
          const isUserSuperAdmin = isSuperAdminAccount(u.email);
          const isAdmin = Boolean(u.isAdmin || isUserOwner || isUserSuperAdmin || u.role?.toLowerCase().includes('admin'));
          const isPro = Boolean(u.isPro || isUserOwner || isUserSuperAdmin || u.plan?.toLowerCase().includes('pro'));
          const plan = u.plan || (isPro ? 'Pro Member' : 'Standard');

          return {
            ...u,
            isAdmin,
            isPro,
            plan,
            isBanned,
            isActive,
            isOnline: isActive,
            status,
            lastActive: isActive ? 'Active now' : (u.lastActive && u.lastActive !== 'Just now' ? u.lastActive : 'Offline'),
          };
        });

        setUsersList(processedUsers);
        console.log('=== [LOGITIX WORKSPACE REGISTERED USERS] ===');
        console.table(processedUsers.map((u: any) => ({
          Email: u.email,
          Name: u.name,
          Role: u.role,
          Plan: u.plan,
          IsAdmin: u.isAdmin,
          IsPro: u.isPro,
          Status: u.status, // Strictly outputs 'ACTIVE', 'INACTIVE', or 'BANNED'
          LastSeen: u.lastActive,
        })));

        const activeCount = processedUsers.filter((u: any) => u.isActive).length;
        const inactiveCount = processedUsers.filter((u: any) => !u.isActive && !u.isBanned).length;
        notifyUserMgmt(`Refreshed: ${processedUsers.length} user(s) — ${activeCount} Active, ${inactiveCount} Inactive.`, false, 3500);
      }
      if (data.bannedEmails) setBannedEmails(data.bannedEmails);
    } catch (err) {
      console.error('Failed to fetch workspace users:', err);
      notifyUserMgmt('Error refreshing user list.', true, 3000);
    } finally {
      setUserMgmtLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleTogglePro = async (targetEmail: string, currentIsPro: boolean) => {
    if (!isOwner) {
      notifyUserMgmt('Permission Denied: Only Workspace Owner can assign Pro Member status.', true, 3500);
      return;
    }
    const nextIsPro = !currentIsPro;
    setUserMgmtLoading(true);
    try {
      const res = await fetch('/api/users/privileges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          operatorEmail: userProfile?.email || '',
          isPro: nextIsPro,
          plan: nextIsPro ? 'Pro Member' : 'Standard',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notifyUserMgmt(data.error || 'Failed to update Pro status.', true);
      } else {
        updateUserPrivilegesLocally(targetEmail, { plan: nextIsPro ? 'Pro Member' : 'Standard' });
        if (userProfile?.email?.toLowerCase() === targetEmail.toLowerCase() && onUpdateProfile) {
          onUpdateProfile({ ...userProfile, plan: nextIsPro ? 'Pro Member' : 'Standard' });
        }
        await fetchUsers();
        notifyUserMgmt(`${targetEmail} is now ${nextIsPro ? 'a Pro Member (⚡ Full Access)' : 'Standard Plan'}.`, false, 4000);
      }
    } catch (err) {
      console.error('Failed to toggle Pro status:', err);
    } finally {
      setUserMgmtLoading(false);
    }
  };

  const handleToggleAdmin = async (targetEmail: string, currentIsAdmin: boolean) => {
    if (!isOwner) {
      notifyUserMgmt('Permission Denied: Only Workspace Owner can assign Admin privileges.', true, 3500);
      return;
    }
    const nextIsAdmin = !currentIsAdmin;
    setUserMgmtLoading(true);
    try {
      const nextRole = nextIsAdmin ? 'Admin' : 'Workspace Member';
      const res = await fetch('/api/users/privileges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          operatorEmail: userProfile?.email || '',
          isAdmin: nextIsAdmin,
          role: nextRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notifyUserMgmt(data.error || 'Failed to update Admin status.', true);
      } else {
        updateUserPrivilegesLocally(targetEmail, { role: nextRole });
        if (userProfile?.email?.toLowerCase() === targetEmail.toLowerCase() && onUpdateProfile) {
          onUpdateProfile({ ...userProfile, role: nextRole });
        }
        await fetchUsers();
        notifyUserMgmt(`${targetEmail} has been ${nextIsAdmin ? 'promoted to Admin (🛡️ Management Access)' : 'changed to Workspace Member'}.`, false, 4000);
      }
    } catch (err) {
      console.error('Failed to toggle Admin status:', err);
    } finally {
      setUserMgmtLoading(false);
    }
  };

  const handleQuickAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignEmailInput.trim() || !assignEmailInput.includes('@')) return;
    if (!isOwner) {
      notifyUserMgmt('Permission Denied: Only Workspace Owner can assign privileges.', true, 3500);
      return;
    }

    setUserMgmtLoading(true);
    try {
      const cleanEmail = assignEmailInput.trim().toLowerCase();
      const roleToSet = assignMakeAdmin ? 'Admin' : 'Workspace Member';
      const planToSet = assignMakePro ? 'Pro Member' : 'Standard';

      const res = await fetch('/api/users/privileges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          operatorEmail: userProfile?.email || '',
          isAdmin: assignMakeAdmin,
          isPro: assignMakePro,
          role: roleToSet,
          plan: planToSet,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notifyUserMgmt(data.error || 'Failed to apply privileges.', true);
      } else {
        updateUserPrivilegesLocally(cleanEmail, { role: roleToSet, plan: planToSet });
        if (userProfile?.email?.toLowerCase() === cleanEmail && onUpdateProfile) {
          onUpdateProfile({ ...userProfile, role: roleToSet, plan: planToSet });
        }
        await fetchUsers();
        setAssignEmailInput('');
        notifyUserMgmt(`Privileges applied for ${cleanEmail}: ${roleToSet} • ${planToSet}`, false, 4000);
      }
    } catch (err) {
      console.error('Failed to quick assign privileges:', err);
    } finally {
      setUserMgmtLoading(false);
    }
  };

  const handleBanUser = async (emailToBan: string) => {
    if (!canModifyAccess) {
      notifyUserMgmt('Permission Denied: Admins have read-only view access and cannot revoke or ban accounts.', true, 3500);
      return;
    }
    const cleanEmail = emailToBan.trim().toLowerCase();
    const userFound = usersList.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!userFound) {
      notifyUserMgmt(`Account not found: No registered workspace user exists with email "${cleanEmail}". Only existing accounts can have access revoked.`, true, 5000);
      return;
    }
    if (userFound.isBanned || bannedEmails.includes(cleanEmail)) {
      notifyUserMgmt(`Account "${cleanEmail}" is already revoked and blocked.`, true, 4000);
      return;
    }

    setUserMgmtLoading(true);
    try {
      const res = await fetch('/api/users/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: cleanEmail,
          operatorEmail: userProfile?.email || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notifyUserMgmt(data.error || 'Failed to revoke access.', true, 5000);
      } else {
        if (data.users) setUsersList(data.users);
        if (data.bannedEmails) setBannedEmails(data.bannedEmails);
        notifyUserMgmt(`User access for ${cleanEmail} (${userFound.name || 'Member'}) has been revoked and blocked.`, false, 4500);
      }
    } catch (err) {
      console.error('Failed to ban user:', err);
      notifyUserMgmt('Network error occurred while revoking access.', true);
    } finally {
      setUserMgmtLoading(false);
    }
  };

  const handleUnbanUser = async (emailToUnban: string) => {
    if (!canModifyAccess) {
      notifyUserMgmt('Permission Denied: Admins have read-only view access and cannot unblock accounts.', true, 3500);
      return;
    }
    const cleanEmail = emailToUnban.trim().toLowerCase();
    setUserMgmtLoading(true);
    try {
      const res = await fetch('/api/users/unban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: cleanEmail,
          operatorEmail: userProfile?.email || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notifyUserMgmt(data.error || 'Failed to unban user.', true, 4000);
      } else {
        if (data.users) setUsersList(data.users);
        if (data.bannedEmails) setBannedEmails(data.bannedEmails);
        notifyUserMgmt(`Access restored for ${cleanEmail}.`, false, 4000);
      }
    } catch (err) {
      console.error('Failed to unban user:', err);
      notifyUserMgmt('Network error occurred while unblocking user.', true);
    } finally {
      setUserMgmtLoading(false);
    }
  };

  const handleDeleteUser = async (emailToDelete: string) => {
    if (!canModifyAccess) {
      notifyUserMgmt('Permission Denied: Admins have read-only view access and cannot delete accounts.', true, 3500);
      return;
    }
    const cleanEmail = emailToDelete.trim().toLowerCase();
    const userFound = usersList.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!userFound) {
      notifyUserMgmt(`Account not found: No registered user exists with email "${cleanEmail}".`, true, 4500);
      return;
    }

    setUserMgmtLoading(true);
    try {
      const operatorParam = encodeURIComponent(userProfile?.email || '');
      const res = await fetch(`/api/users/${encodeURIComponent(cleanEmail)}?operator=${operatorParam}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        notifyUserMgmt(data.error || 'Failed to delete user.', true, 4500);
      } else {
        if (data.users) setUsersList(data.users);
        if (data.bannedEmails) setBannedEmails(data.bannedEmails);
        notifyUserMgmt(`User ${cleanEmail} removed from workspace.`, false, 4000);
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
      notifyUserMgmt('Network error occurred while deleting user.', true);
    } finally {
      setUserMgmtLoading(false);
    }
  };

  const handleManualBanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModifyAccess) {
      notifyUserMgmt('Permission Denied: Admins have read-only view access.', true, 3500);
      return;
    }
    const clean = manualBanEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      notifyUserMgmt('Please enter a valid email address.', true, 3500);
      return;
    }

    // Crucial check: verify whether target user exists in registered users
    const userFound = usersList.find((u) => u.email.toLowerCase() === clean);
    if (!userFound) {
      notifyUserMgmt(`Account not found: No registered workspace user exists with email "${clean}". Only existing registered accounts can have access revoked.`, true, 5000);
      return;
    }

    if (userFound.isBanned || bannedEmails.includes(clean)) {
      notifyUserMgmt(`Account "${clean}" is already revoked and blocked.`, true, 4000);
      return;
    }

    handleBanUser(clean);
    setManualBanEmail('');
  };

  useEffect(() => {
    if (userProfile) {
      setNameInput(userProfile.name);
      if (userProfile.age) setAgeInput(userProfile.age);
      if (userProfile.dob) setDobInput(userProfile.dob);
      setRoleInput(userProfile.role);
    }
  }, [userProfile]);

  const providers = [
    { id: 'gemini', name: 'Google Gemini', desc: 'Active • Built-in `@google/genai` Server SDK', badge: 'Active' },
    { id: 'manus', name: 'Manus AI (Autonomous Agent)', desc: 'Official Autonomous Agent Engine • Manus API Key (https://manus.im)', badge: 'Active' },
    { id: 'anthropic', name: 'Anthropic Claude 3.7', desc: 'Direct Claude Key or via AIML Proxy', badge: 'Supported' },
    { id: 'aiml', name: 'AIML API (All-in-One)', desc: 'Combined API Key • Claude 3.5/3.7, DeepSeek R1, Llama 3', badge: 'Ready' },
    { id: 'deepseek', name: 'DeepSeek R1', desc: 'Deep Mathematical & Logical Proof Engine', badge: 'Supported' },
    { id: 'ollama', name: 'Ollama Local OS', desc: 'Private Local LLM Engine (100% Offline)', badge: 'Supported' },
  ];

  const updateProfileField = (newName: string, newAge: string, newDob: string, newRole: string) => {
    if (onUpdateProfile) {
      const parts = newName.trim().split(' ');
      const avatar = parts.length >= 2 
        ? (parts[0][0] + parts[1][0]).toUpperCase() 
        : parts[0] ? parts[0].slice(0, 2).toUpperCase() : 'EX';

      const updatedProfile: UserProfile = {
        name: newName.trim() || 'Executive Member',
        age: newAge.trim() || '25',
        dob: newDob,
        role: newRole.trim() || 'Workspace Member',
        plan: userProfile?.plan || 'Full Access Workspace',
        avatar,
        email: userProfile?.email,
        accessToken: userProfile?.accessToken,
        hasPassword: true,
      };

      onUpdateProfile(updatedProfile);

      if (userProfile?.email) {
        saveSavedUserProfile(userProfile.email, updatedProfile);
      }
    }
  };

  const handleUnlockAdminPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError(null);
    if (!adminPasswordInput.trim()) {
      setAdminAuthError('Please enter the Admin Security Password.');
      return;
    }
    setAdminAuthLoading(true);
    try {
      const isValid = await verifyAdminPassword(adminPasswordInput.trim());
      if (isValid) {
        setIsAdminPanelUnlocked(true);
        setAdminPasswordInput('');
        fetchUsers();
      } else {
        setAdminAuthError('Incorrect Admin Password. (Default: admin123)');
      }
    } catch (err: any) {
      setAdminAuthError(err?.message || 'Verification error occurred.');
    } finally {
      setAdminAuthLoading(false);
    }
  };

  const handleChangeAdminPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPasswordChangeError(null);
    setAdminPasswordChangeSuccess(null);

    if (!newAdminPasswordInput || newAdminPasswordInput.length < 4) {
      setAdminPasswordChangeError('New password must be at least 4 characters long.');
      return;
    }
    if (newAdminPasswordInput !== confirmAdminPasswordInput) {
      setAdminPasswordChangeError('New passwords do not match. Please re-enter.');
      return;
    }

    setAdminPasswordChangeLoading(true);
    try {
      const res = await changeAdminPassword(currentAdminPasswordInput, newAdminPasswordInput);
      if (res.success) {
        setAdminPasswordChangeSuccess('Admin Master Password successfully updated!');
        setCurrentAdminPasswordInput('');
        setNewAdminPasswordInput('');
        setConfirmAdminPasswordInput('');
        setTimeout(() => {
          setShowAdminPasswordModal(false);
          setAdminPasswordChangeSuccess(null);
        }, 1800);
      } else {
        setAdminPasswordChangeError(res.error || 'Failed to update Admin password.');
      }
    } catch (err: any) {
      setAdminPasswordChangeError(err?.message || 'Failed to update Admin password.');
    } finally {
      setAdminPasswordChangeLoading(false);
    }
  };

  return (
    <div className="w-full p-4 sm:p-6 space-y-6 max-w-5xl mx-auto z-10">
      {/* Header */}
      <div className={`flex items-center justify-between pb-4 border-b ${darkMode ? 'border-white/5' : 'border-slate-200'}`}>
        <div>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Settings className="w-5 h-5 text-blue-500" />
            LOGITIX System Settings & Account Profile
          </h2>
          <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Configure member profile details, AI provider models, and application preferences.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Account Member Profile Section (No password required - Personal settings unlocked) */}
        <div className={`p-5 rounded-2xl border space-y-5 shadow-xl backdrop-blur-2xl ${
          darkMode ? 'bg-white/5 border-white/5 text-slate-200' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <User className="w-4 h-4 text-emerald-500" />
                Personal Profile & Credentials
              </h3>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Active Member
              </span>
            </div>
          </div>

          {/* Profile Input Fields */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className={`text-[11px] font-mono uppercase tracking-wider block ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    updateProfileField(e.target.value, ageInput, dobInput, roleInput);
                  }}
                  className={`w-full h-10 pl-9 pr-3 rounded-xl border text-xs focus:outline-none focus:border-emerald-500/50 ${
                    darkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={`text-[11px] font-mono uppercase tracking-wider block ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Age
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="1"
                  max="120"
                  required
                  value={ageInput}
                  onChange={(e) => {
                    setAgeInput(e.target.value);
                    updateProfileField(nameInput, e.target.value, dobInput, roleInput);
                  }}
                  className={`w-full h-10 pl-9 pr-3 rounded-xl border text-xs focus:outline-none focus:border-emerald-500/50 ${
                    darkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-3">
              <label className={`text-[11px] font-mono uppercase tracking-wider block ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Date of Birth (Day / Month / Year)
              </label>
              <DateOfBirthPicker
                value={dobInput}
                darkMode={darkMode}
                onChange={(newDob, autoAge) => {
                  setDobInput(newDob);
                  const effectiveAge = autoAge || ageInput;
                  if (autoAge) setAgeInput(autoAge);
                  updateProfileField(nameInput, effectiveAge, newDob, roleInput);
                }}
              />
            </div>
          </div>
        </div>

        {/* Workspace User & Access Control Management Panel (Protected by Admin Password) */}
        {canViewAccessPanel && (
          !isAdminPanelUnlocked ? (
            /* Admin Panel Password Security Gate */
            <div className={`p-6 rounded-2xl border space-y-4 shadow-xl backdrop-blur-2xl ${
              darkMode ? 'bg-white/5 border-indigo-500/30 text-slate-200' : 'bg-white border-indigo-200 text-slate-900 shadow-sm'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Admin Panel Security Clearance
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-medium">
                        Password Protected
                      </span>
                    </h3>
                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Workspace administration, session audits, role elevation, and access management require Admin Password authentication.
                    </p>
                  </div>
                </div>
              </div>

              {adminAuthError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{adminAuthError}</span>
                </div>
              )}

              <form onSubmit={handleUnlockAdminPanel} className="max-w-md space-y-3 pt-1">
                <div className="space-y-1.5">
                  <label className={`text-[11px] font-mono uppercase tracking-wider block ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Admin Master Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-indigo-500 absolute left-3.5 top-3" />
                    <input
                      type={showAdminPasswordInput ? 'text' : 'password'}
                      required
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      placeholder="Enter Admin Password (Default: admin123)"
                      className={`w-full h-10 pl-10 pr-10 rounded-xl border text-xs font-mono focus:outline-none focus:border-indigo-500/60 ${
                        darkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPasswordInput(!showAdminPasswordInput)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showAdminPasswordInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={adminAuthLoading}
                    className="h-10 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20 disabled:opacity-60 transition-all"
                  >
                    {adminAuthLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span>Unlock Admin Panel</span>
                      </>
                    )}
                  </button>
                  <span className={`text-[11px] font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Default Admin Key: <strong className="text-indigo-500">admin123</strong>
                  </span>
                </div>
              </form>
            </div>
          ) : (
          <div className={`p-5 rounded-2xl border space-y-4 shadow-xl backdrop-blur-2xl ${
            darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className={`flex items-center justify-between pb-2 border-b ${darkMode ? 'border-white/5' : 'border-slate-200'}`}>
              <div>
                <h3 className={`text-sm font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Shield className="w-4 h-4 text-rose-500" />
                  <span>Workspace User & Access Control</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                    Admin Authenticated
                  </span>
                  {isReadOnlyAdmin && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-medium">
                      Admin View-Only
                    </span>
                  )}
                </h3>
                <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isOwner 
                    ? 'Owner Authority: Full access control over all accounts including Super Admins. The Owner cannot be revoked.' 
                    : isSuperAdmin
                      ? 'Super Admin panel: manage registered accounts, view email addresses, and revoke standard workspace member sessions.'
                      : 'Admin View-Only: You can view registered workspace sessions and account statuses, but only the Workspace Owner or Super Admin can make modifications.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPasswordModal(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all border cursor-pointer ${
                    darkMode ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                  }`}
                  title="Update Admin Security Master Password"
                >
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Admin Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdminPanelUnlocked(false)}
                  className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all border cursor-pointer ${
                    darkMode ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                  }`}
                  title="Lock Admin Panel"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lock Panel</span>
                </button>
                <button
                  type="button"
                  onClick={fetchUsers}
                  disabled={userMgmtLoading}
                  className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all border cursor-pointer ${
                    darkMode ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${userMgmtLoading ? 'animate-spin text-purple-400' : 'text-slate-400'}`} />
                  <span>Refresh Users</span>
                </button>
              </div>
            </div>

            {/* Read-Only Admin Informational Notice */}
            {isReadOnlyAdmin && (
              <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                darkMode ? 'bg-indigo-950/25 border-indigo-500/30 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-900'
              }`}>
                <ShieldAlert className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span>
                  <strong>Admin View-Only Mode:</strong> You have permission to inspect all registered workspace accounts, session activities, and tier statuses. Account modifications (role adjustments, revoking access, deletions) are restricted to the Workspace Owner and Super Admins.
                </span>
              </div>
            )}

            {userMgmtMsg && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
                userMgmtMsg.isError
                  ? darkMode ? 'bg-rose-950/40 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
                  : darkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                {userMgmtMsg.isError ? (
                  <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                )}
                <span className="font-medium">{userMgmtMsg.text}</span>
              </div>
            )}

            {/* Quick Manual Email Ban/Revoke Form (Owner & Super Admin Only) */}
            {canModifyAccess && (
              <form onSubmit={handleManualBanSubmit} className={`p-4 rounded-xl border space-y-2.5 ${
                darkMode ? 'bg-rose-950/20 border-rose-500/30' : 'bg-rose-50/50 border-rose-200'
              }`}>
                <div className="flex items-center justify-between">
                  <label className={`text-[11px] font-mono uppercase tracking-wider block font-bold ${
                    darkMode ? 'text-rose-300' : 'text-rose-700'
                  }`}>
                    Revoke Access For Existing Member
                  </label>
                  <span className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Requires an existing registered account
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={manualBanEmail}
                      onChange={(e) => setManualBanEmail(e.target.value)}
                      placeholder="Enter registered member email (e.g. member@gmail.com)"
                      className={`w-full h-10 pl-9 pr-3 rounded-xl border text-xs focus:outline-none focus:border-rose-500/50 ${
                        darkMode ? 'bg-black/30 border-white/10 text-white placeholder:text-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!manualBanEmail.trim() || userMgmtLoading}
                    className="h-10 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-600 dark:text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 flex-shrink-0"
                  >
                    <UserX className="w-3.5 h-3.5 text-rose-500" />
                    <span>Revoke Access</span>
                  </button>
                </div>
                <div className={`text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-1 ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <span>Non-existent emails cannot be revoked. Only active registered accounts can have access removed.</span>
                  <span className="hidden sm:inline">Or click "Revoke Access" directly on any user card below.</span>
                </div>
              </form>
            )}

            {/* Blocked / Banned Accounts Dedicated Control */}
            {bannedEmails.length > 0 && (
              <div className={`p-3.5 rounded-xl border space-y-2 ${darkMode ? 'bg-rose-950/20 border-rose-500/30' : 'bg-rose-50 border-rose-200'}`}>
                <div className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-500" />
                  <span>Blocked Email Addresses ({bannedEmails.length})</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                  {bannedEmails.map((blockedEmail) => (
                    <div
                      key={blockedEmail}
                      className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                        darkMode ? 'bg-black/40 border-rose-500/20' : 'bg-white border-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 animate-pulse" />
                        <span className={`text-xs font-mono truncate ${darkMode ? 'text-rose-200' : 'text-rose-900 font-medium'}`}>{blockedEmail}</span>
                      </div>
                      {canModifyAccess ? (
                        <button
                          type="button"
                          onClick={() => handleUnbanUser(blockedEmail)}
                          disabled={userMgmtLoading}
                          className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer flex-shrink-0"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Unblock Email</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 flex-shrink-0">
                          Blocked
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Owner Privilege Authority Card: Grant Pro Member & Admin */}
            {isOwner && (
              <div className={`p-4 rounded-xl border space-y-3 ${
                darkMode ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50/70 border-amber-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <span className={`text-xs font-bold font-mono uppercase tracking-wider ${
                      darkMode ? 'text-amber-300' : 'text-amber-900'
                    }`}>
                      Owner Authority: Grant Pro Member & Admin Privileges
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold">
                    Owner Exclusive
                  </span>
                </div>
                <p className={`text-[11px] leading-relaxed ${darkMode ? 'text-amber-200/80' : 'text-amber-950/80'}`}>
                  As Workspace Owner, you have exclusive authority to promote any user to <strong>Admin</strong> (management rights) and <strong>Pro Member</strong> (unlocked AI models & workspace tools). Use this quick form or click the toggles directly in the user accounts table below.
                </p>
                <form onSubmit={handleQuickAssignSubmit} className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    type="email"
                    required
                    value={assignEmailInput}
                    onChange={(e) => setAssignEmailInput(e.target.value)}
                    placeholder="User email address (e.g. member@gmail.com)"
                    className={`flex-1 min-w-[200px] h-9 px-3 rounded-lg border text-xs font-mono focus:outline-none focus:border-amber-500 ${
                      darkMode ? 'bg-black/40 border-amber-500/30 text-white placeholder:text-slate-500' : 'bg-white border-amber-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setAssignMakePro(!assignMakePro)}
                    className={`h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      assignMakePro
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm shadow-amber-500/20'
                        : darkMode ? 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{assignMakePro ? '✓ Pro Member' : '+ Pro Member'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignMakeAdmin(!assignMakeAdmin)}
                    className={`h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      assignMakeAdmin
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-500/20'
                        : darkMode ? 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{assignMakeAdmin ? '✓ Admin Role' : '+ Admin Role'}</span>
                  </button>
                  <button
                    type="submit"
                    disabled={userMgmtLoading || !assignEmailInput.trim()}
                    className="h-9 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-40 transition-all"
                  >
                    <Check className="w-3.5 h-3.5 text-slate-950" />
                    <span>Apply Privileges</span>
                  </button>
                </form>
              </div>
            )}

            {/* Registered Users Table with Search and Filtering */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className={`text-xs font-mono uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  <span className="font-semibold">Registered Workspace Accounts ({usersList.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  {bannedEmails.length > 0 && (
                    <span className="text-rose-500 font-bold text-[11px] bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      {bannedEmails.length} Blocked
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {usersList.filter((u) => u.isActive).length} Active Now
                  </span>
                </div>
              </div>

              {/* Real-time Account Search & Lookup Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={accountSearchQuery}
                  onChange={(e) => setAccountSearchQuery(e.target.value)}
                  placeholder="Search registered accounts by name, email, role, or plan..."
                  className={`w-full h-10 pl-9 pr-9 rounded-xl border text-xs focus:outline-none focus:border-purple-500/50 transition-all ${
                    darkMode
                      ? 'bg-black/30 border-white/10 text-white placeholder:text-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
                {accountSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setAccountSearchQuery('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                {filteredUsersList.length === 0 ? (
                  <div className={`p-6 rounded-2xl border text-center text-xs ${
                    darkMode ? 'bg-black/20 border-white/5 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    {accountSearchQuery ? (
                      <div>
                        <p className="font-semibold mb-1">No registered accounts found matching "{accountSearchQuery}".</p>
                        <p className="text-[11px] text-slate-400">Try searching for a different name, email, or role.</p>
                      </div>
                    ) : (
                      'No registered user sessions found.'
                    )}
                  </div>
                ) : (
                  filteredUsersList.map((user) => {
                    const isBanned = user.isBanned || bannedEmails.includes(user.email.toLowerCase());
                    const isThisOwner = isOwnerAccount(user.email);
                    const isThisSuperAdmin = isSuperAdminAccount(user.email);
                    const isCurrentUser = userProfile?.email?.toLowerCase() === user.email.toLowerCase();
                    const isUserAdmin = Boolean(user.isAdmin || isThisOwner || isThisSuperAdmin || user.role?.toLowerCase().includes('admin'));
                    const isUserPro = Boolean(user.isPro || isThisOwner || isThisSuperAdmin || user.plan?.toLowerCase().includes('pro'));

                    return (
                      <div
                        key={user.email}
                        className={`p-4 rounded-2xl border transition-all ${
                          isBanned
                            ? darkMode ? 'bg-rose-950/20 border-rose-500/30' : 'bg-rose-50/70 border-rose-200'
                            : darkMode ? 'bg-white/[0.03] border-white/10 hover:border-white/20' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                        }`}
                      >
                        {/* Card Header: Avatar, Name/Email, and Status Pill */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm ${
                                isBanned
                                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                                  : isThisOwner
                                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 ring-2 ring-amber-500/20'
                                    : isThisSuperAdmin
                                      ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/40 ring-2 ring-indigo-500/20'
                                      : isUserAdmin
                                        ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                                        : 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {user.avatar || (isThisOwner ? 'LX' : isThisSuperAdmin ? 'SS' : 'US')}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {user.name}
                                </span>
                                {isCurrentUser && (
                                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex-shrink-0">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className={`text-xs font-mono truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {user.email}
                              </div>
                            </div>
                          </div>

                          {/* Online / Active Status Pill */}
                          <div className="flex-shrink-0">
                            {isBanned ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-medium">
                                <Lock className="w-3 h-3 text-rose-500" />
                                <span>Blocked</span>
                              </span>
                            ) : user.isActive ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Active now</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/25 font-medium">
                                <span className="w-2 h-2 rounded-full bg-slate-400" />
                                <span>{user.lastActive && user.lastActive !== 'Offline' ? user.lastActive : 'Offline'}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Middle: Role & Tier Badges */}
                        <div className={`flex flex-wrap items-center gap-2 mt-3 pt-2.5 pb-2.5 border-t border-b ${
                          darkMode ? 'border-white/5' : 'border-slate-100'
                        }`}>
                          {/* Role Tag */}
                          {isThisOwner ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 font-bold">
                              <Crown className="w-3 h-3 text-amber-500" />
                              Owner & Super Admin
                            </span>
                          ) : isThisSuperAdmin ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 border border-indigo-500/40 font-bold">
                              <ShieldCheck className="w-3 h-3 text-indigo-500" />
                              Super Admin
                            </span>
                          ) : isUserAdmin ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-800 dark:text-purple-200 border border-purple-500/40 font-bold">
                              <Shield className="w-3 h-3 text-purple-500" />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30 font-medium">
                              <User className="w-3 h-3 text-blue-500" />
                              Workspace Member
                            </span>
                          )}

                          {/* Plan Tag */}
                          {isUserPro ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 font-bold">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              Pro Member • ⚡ Fastest & Unlimited
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/25">
                              Standard Tier • Max 20 Chats • 50 Q/day
                            </span>
                          )}
                        </div>

                        {/* Card Bottom: Management Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-0.5">
                          {isThisOwner ? (
                            <div className="flex items-center gap-1.5 text-xs font-mono text-amber-600 dark:text-amber-400">
                              <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                              <span>Permanent Workspace Owner (immune to demotion or ban)</span>
                            </div>
                          ) : isReadOnlyAdmin ? (
                            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                              <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span>Read-only view • Modifications restricted</span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2 w-full justify-end">
                              {/* Owner Only: Toggle Pro & Admin */}
                              {isOwner && (
                                <>
                                  <button
                                    type="button"
                                    disabled={userMgmtLoading || isBanned}
                                    onClick={() => handleTogglePro(user.email, isUserPro)}
                                    title={isUserPro ? 'Click to revoke Pro Member privileges' : 'Click to grant Pro Member privileges'}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer disabled:opacity-40 ${
                                      isUserPro
                                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 border-amber-500/40 shadow-sm'
                                        : darkMode ? 'bg-white/5 hover:bg-amber-500/10 text-slate-300 border-white/10 hover:border-amber-500/30' : 'bg-slate-100 hover:bg-amber-50 text-slate-700 border-slate-200 hover:border-amber-300'
                                    }`}
                                  >
                                    <Sparkles className={`w-3.5 h-3.5 ${isUserPro ? 'text-amber-500 fill-amber-500/30' : 'text-amber-500'}`} />
                                    <span>{isUserPro ? 'Pro Member ✓' : '+ Pro Member'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={userMgmtLoading || isBanned || isThisSuperAdmin}
                                    onClick={() => handleToggleAdmin(user.email, isUserAdmin)}
                                    title={
                                      isThisSuperAdmin 
                                        ? 'Super Admin role is fixed' 
                                        : isUserAdmin 
                                          ? 'Click to demote from Admin' 
                                          : 'Click to promote to Admin'
                                    }
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer disabled:opacity-40 ${
                                      isUserAdmin
                                        ? 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-800 dark:text-indigo-200 border-indigo-500/40 shadow-sm'
                                        : darkMode ? 'bg-white/5 hover:bg-indigo-500/10 text-slate-300 border-white/10 hover:border-indigo-500/30' : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 border-slate-200 hover:border-indigo-300'
                                    }`}
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>{isUserAdmin ? 'Admin Role ✓' : '+ Admin Role'}</span>
                                  </button>
                                </>
                              )}

                              {/* Ban / Restore Access Button */}
                              {isBanned ? (
                                <button
                                  type="button"
                                  disabled={userMgmtLoading}
                                  onClick={() => handleUnbanUser(user.email)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-emerald-500/30 cursor-pointer disabled:opacity-40"
                                >
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Restore Access</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isCurrentUser || (!isOwner && isThisSuperAdmin) || userMgmtLoading}
                                  onClick={() => handleBanUser(user.email)}
                                  title={
                                    isCurrentUser 
                                      ? 'Cannot revoke your own active account' 
                                      : (!isOwner && isThisSuperAdmin)
                                        ? 'Only Owner can revoke Super Admins'
                                        : 'Revoke workspace access'
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all border border-rose-500/30 cursor-pointer disabled:opacity-40"
                                >
                                  <UserX className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Revoke Access</span>
                                </button>
                              )}

                              {/* Delete User Button */}
                              <button
                                type="button"
                                disabled={isCurrentUser || (!isOwner && isThisSuperAdmin) || userMgmtLoading}
                                onClick={() => handleDeleteUser(user.email)}
                                title={
                                  isCurrentUser 
                                    ? 'Cannot delete your own active account' 
                                    : (!isOwner && isThisSuperAdmin)
                                      ? 'Only Owner can delete Super Admins'
                                      : 'Permanently delete user record'
                                }
                                className={`p-2 rounded-lg transition-all border cursor-pointer disabled:opacity-40 ${
                                  darkMode ? 'bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border-white/10' : 'bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 border-slate-200'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Provider Selection Abstraction Layer */}
        <div className={`p-5 rounded-2xl border space-y-4 shadow-xl backdrop-blur-2xl ${
          darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Cpu className="w-4 h-4 text-purple-500" />
            AI Provider Abstraction Layer
          </h3>

          <div className="grid md:grid-cols-2 gap-3">
            {providers.map((p) => {
              const isSel = selectedProvider === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id as AIProvider)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between backdrop-blur-2xl ${
                    isSel
                      ? darkMode ? 'bg-white/10 border-white/10 shadow-md text-white' : 'bg-blue-50 border-blue-300 text-slate-900 shadow-sm'
                      : darkMode ? 'bg-black/20 border-white/5 hover:border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div>
                    <h4 className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{p.name}</h4>
                    <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{p.desc}</p>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      isSel
                        ? darkMode ? 'bg-white/10 text-white border-white/10' : 'bg-blue-100 text-blue-800 border-blue-200'
                        : darkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-200 text-slate-600 border-slate-300'
                    }`}
                  >
                    {p.badge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Model Selection */}
        <div className={`p-5 rounded-2xl border space-y-3 shadow-xl backdrop-blur-2xl ${
          darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Sparkles className="w-4 h-4 text-cyan-500" />
            Model Selection
          </h3>
          <select
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            className={`w-full h-10 px-3 rounded-xl border text-xs focus:outline-none ${
              darkMode ? 'bg-[#0a0f1d] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Ultra Fast & Low Latency - Default)</option>
            <option value="gemini-flash-latest">Gemini Flash Latest (Dynamic Healthy Cluster)</option>
            <option value="gemini-3.8-flash">Gemini 3.8 Flash (Frontier Model)</option>
            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep STEM Reasoning)</option>
            <option value="manus-ai">Manus AI Autonomous Agent (Manus API Key / Agent Engine)</option>
            <option value="claude-3-7-sonnet">Anthropic Claude 3.7 Sonnet (Claude API / AIML Key)</option>
            <option value="deepseek/deepseek-r1">DeepSeek R1 (AIML Key / Deep Reasoning)</option>
            <option value="ollama-llama3">Ollama Llama 3.3 (Local Private OS)</option>
          </select>

          {/* Combined API Diagnostics Banner */}
          <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            darkMode ? 'bg-black/30 border-white/5 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-[11px]">Combined AI Pipeline:</span>
              <span className="text-[11px] text-slate-400 font-mono">Gemini + Claude + Manus AI + DeepSeek</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Active Server Proxy
            </span>
          </div>
        </div>

        {/* Semantic Versioning & Application Status */}
        <div className={`p-5 rounded-2xl border space-y-4 shadow-xl backdrop-blur-2xl ${
          darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <Tag className="w-4 h-4 text-emerald-500" />
              <span>Application Version & Semantic Strategy</span>
            </h3>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              v{APP_VERSION.version} ({APP_VERSION.channel})
            </span>
          </div>

          <div className={`grid md:grid-cols-3 gap-3 p-4 rounded-xl border text-xs ${
            darkMode ? 'bg-black/30 border-white/5' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className={`text-[10px] uppercase font-mono tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Release Version</div>
              <div className={`text-sm font-bold mt-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>v{APP_VERSION.version}</div>
            </div>
            <div>
              <div className={`text-[10px] uppercase font-mono tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Codename</div>
              <div className="text-sm font-bold text-purple-600 dark:text-purple-300 mt-0.5">{APP_VERSION.codename}</div>
            </div>
            <div>
              <div className={`text-[10px] uppercase font-mono tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Release Date</div>
              <div className={`text-sm font-bold mt-0.5 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{APP_VERSION.releaseDate}</div>
            </div>
          </div>

          {/* SemVer Rules Grid */}
          <div className="space-y-2">
            <div className={`text-xs font-semibold flex items-center gap-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span>Semantic Versioning Rules (MAJOR.MINOR.PATCH)</span>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div className={`p-3 rounded-xl border text-xs ${darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div className="font-bold text-purple-600 dark:text-purple-300 font-mono mb-1">{SEMVER_GUIDELINES.major.title}</div>
                <p className={`text-[11px] leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{SEMVER_GUIDELINES.major.description}</p>
              </div>

              <div className={`p-3 rounded-xl border text-xs ${darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div className="font-bold text-blue-600 dark:text-blue-300 font-mono mb-1">{SEMVER_GUIDELINES.minor.title}</div>
                <p className={`text-[11px] leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{SEMVER_GUIDELINES.minor.description}</p>
              </div>

              <div className={`p-3 rounded-xl border text-xs ${darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div className="font-bold text-emerald-600 dark:text-emerald-300 font-mono mb-1">{SEMVER_GUIDELINES.patch.title}</div>
                <p className={`text-[11px] leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{SEMVER_GUIDELINES.patch.description}</p>
              </div>
            </div>
          </div>

          {/* Latest Changelog */}
          <div className={`p-4 rounded-xl border space-y-2 ${darkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`text-xs font-bold flex items-center justify-between ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              <span className="flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5 text-purple-500" />
                <span>v{APP_VERSION.changelog[0].version} Release Notes ({APP_VERSION.changelog[0].date})</span>
              </span>
              <span className="text-[10px] text-purple-700 dark:text-purple-300 font-mono uppercase bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                {APP_VERSION.changelog[0].type}
              </span>
            </div>
            <ul className="space-y-1">
              {APP_VERSION.changelog[0].changes.map((item, idx) => (
                <li key={idx} className={`text-[11px] flex items-start gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <span className="text-purple-500 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Admin Panel Master Password Management Modal */}
      {showAdminPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl border p-5 sm:p-6 shadow-2xl relative ${
            darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Admin Security Password</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Workspace Administration Master Key
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdminPasswordModal(false);
                  setAdminPasswordChangeError(null);
                  setAdminPasswordChangeSuccess(null);
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="pt-4 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Update the master password that protects the Workspace User & Access Control Panel. Default is <code className="font-mono text-indigo-400">admin123</code>.
              </p>

              {adminPasswordChangeSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{adminPasswordChangeSuccess}</span>
                </div>
              )}

              {adminPasswordChangeError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{adminPasswordChangeError}</span>
                </div>
              )}

              <form onSubmit={handleChangeAdminPasswordSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    Current Admin Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showCurrentAdminPwd ? 'text' : 'password'}
                      required
                      value={currentAdminPasswordInput}
                      onChange={(e) => setCurrentAdminPasswordInput(e.target.value)}
                      placeholder="Current Admin Password (or admin123)"
                      className={`w-full h-9 pl-9 pr-8 rounded-xl border text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                        darkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentAdminPwd(!showCurrentAdminPwd)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showCurrentAdminPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    New Admin Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-indigo-400 absolute left-3 top-2.5" />
                    <input
                      type={showNewAdminPwd ? 'text' : 'password'}
                      required
                      value={newAdminPasswordInput}
                      onChange={(e) => setNewAdminPasswordInput(e.target.value)}
                      placeholder="Min 4 characters"
                      className={`w-full h-9 pl-9 pr-8 rounded-xl border text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                        darkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewAdminPwd(!showNewAdminPwd)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showNewAdminPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    Confirm New Admin Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-indigo-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={confirmAdminPasswordInput}
                      onChange={(e) => setConfirmAdminPasswordInput(e.target.value)}
                      placeholder="Re-enter new admin password"
                      className={`w-full h-9 pl-9 pr-8 rounded-xl border text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                        darkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminPasswordModal(false);
                      setAdminPasswordChangeError(null);
                      setAdminPasswordChangeSuccess(null);
                    }}
                    className={`h-9 px-4 rounded-xl border text-xs font-medium cursor-pointer ${
                      darkMode ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adminPasswordChangeLoading}
                    className="h-9 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-60 transition-all"
                  >
                    {adminPasswordChangeLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Admin Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
