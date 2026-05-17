'use client';

import { useState, useMemo } from 'react';
import { KeyRound, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui';
import { api } from '@/lib/api';

/**
 * Reusable change-password modal. Two modes:
 *
 *   mode: 'self'   → calls PATCH /admin/users/me/password. Requires the
 *                    caller's current password as the security boundary
 *                    so a stolen access token alone can't rotate it.
 *
 *   mode: 'reset'  → calls PUT /admin/users/:id/password. Super-admin
 *                    override; no current-password check. Used to
 *                    recover a locked-out colleague. Backend refuses to
 *                    reset a peer super_admin.
 *
 * Same password-strength regex as the backend (`@Matches`) — uppercase,
 * lowercase, digit, special. We surface the rule INLINE before submit so
 * the user isn't bounced by a server-side 400 they could have avoided.
 */
export interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'self' | 'reset';
  /** Required when `mode === 'reset'`. The target admin's user ID. */
  targetAdminId?: string;
  /** Cosmetic — shown in the modal subtitle to disambiguate who's being changed. */
  targetAdminName?: string;
}

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,72}$/;

interface PasswordStrength {
  ok: boolean;
  rules: { label: string; passed: boolean }[];
}

function evaluatePassword(pw: string): PasswordStrength {
  const rules = [
    { label: 'At least 8 characters', passed: pw.length >= 8 },
    { label: 'One uppercase letter', passed: /[A-Z]/.test(pw) },
    { label: 'One lowercase letter', passed: /[a-z]/.test(pw) },
    { label: 'One number', passed: /\d/.test(pw) },
    { label: 'One special character (@$!%*?&)', passed: /[@$!%*?&]/.test(pw) },
  ];
  return { ok: rules.every((r) => r.passed), rules };
}

/** Same generator as the create-admin flow — guarantees rule compliance. */
function generateSecurePassword(length = 16): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '@$!%*?&';
  const all = upper + lower + digits + special;
  const result: string[] = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = result.length; i < length; i++) {
    result.push(all[Math.floor(Math.random() * all.length)]);
  }
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.join('');
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  mode,
  targetAdminId,
  targetAdminName,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const strength = useMemo(() => evaluatePassword(newPassword), [newPassword]);
  const confirmMatches = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit =
    !submitting &&
    strength.ok &&
    confirmMatches &&
    (mode === 'reset' || currentPassword.length > 0);

  function resetForm() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setServerError(null);
  }

  function handleClose() {
    if (submitting) return;
    resetForm();
    onClose();
  }

  function handleGenerate() {
    const generated = generateSecurePassword(16);
    setNewPassword(generated);
    setConfirmPassword(generated);
    // Reveal so the admin can copy + share it out-of-band before closing.
    setShowNew(true);
  }

  async function handleCopy() {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      toast.success('Password copied to clipboard');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setServerError(null);
    setSubmitting(true);

    try {
      if (mode === 'self') {
        await api.adminUsers.changeMyPassword({ currentPassword, newPassword });
        toast.success('Password changed successfully', {
          description: 'Your next login will use the new password.',
        });
      } else {
        if (!targetAdminId) {
          setServerError('Missing target admin ID.');
          setSubmitting(false);
          return;
        }
        await api.adminUsers.resetPassword(targetAdminId, { newPassword });
        toast.success(
          targetAdminName
            ? `Password reset for ${targetAdminName}`
            : 'Password reset',
          {
            description:
              'Share the new password with them through a secure channel. Their existing sessions stay valid until expiry.',
          },
        );
      }
      resetForm();
      onClose();
    } catch (err) {
      const message =
        (err as { message?: string })?.message ??
        'Something went wrong. Please try again.';
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const modalTitle = mode === 'self' ? 'Change password' : 'Reset password';
  const modalSubtitle =
    mode === 'self'
      ? 'Update your sign-in password'
      : targetAdminName
        ? `Set a new password for ${targetAdminName}`
        : 'Set a new password for this admin';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} subtitle={modalSubtitle} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Reset-mode banner: explain the audit + sharing expectations */}
        {mode === 'reset' && (
          <div className="flex gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <div className="font-medium">This action is audit-logged.</div>
              <div className="text-amber-800">
                Share the new password with the admin through a secure channel
                (e.g. 1Password, Signal). Their existing sessions stay valid
                until their tokens expire — they won&apos;t be force-logged-out.
              </div>
            </div>
          </div>
        )}

        {/* Current password — self mode only */}
        {mode === 'self' && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Current password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                disabled={submitting}
                className="w-full px-3 py-2 pr-10 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-500/30 focus:border-ruby-500 transition-all"
                placeholder="Enter your current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* New password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-gray-700">New password</label>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={submitting}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-ruby-600 hover:text-ruby-700 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Generate secure
            </button>
          </div>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              disabled={submitting}
              className="w-full px-3 py-2 pr-20 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-500/30 focus:border-ruby-500 transition-all"
              placeholder="At least 8 chars, mixed case, number, special"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
              {newPassword.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copy"
                  tabIndex={-1}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Live strength checklist */}
          {newPassword.length > 0 && (
            <div className="mt-2 grid grid-cols-1 gap-1">
              {strength.rules.map((rule) => (
                <div key={rule.label} className="flex items-center gap-1.5 text-[11px]">
                  {rule.passed ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-gray-300 shrink-0" />
                  )}
                  <span className={rule.passed ? 'text-emerald-700' : 'text-gray-500'}>
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm new password */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Confirm new password
          </label>
          <input
            type={showNew ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            disabled={submitting}
            className={`w-full px-3 py-2 text-sm bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
              confirmPassword.length === 0
                ? 'border-gray-200 focus:ring-ruby-500/30 focus:border-ruby-500'
                : confirmMatches
                  ? 'border-emerald-300 focus:ring-emerald-500/30 focus:border-emerald-500'
                  : 'border-red-300 focus:ring-red-500/30 focus:border-red-500'
            }`}
            placeholder="Re-type the new password"
          />
          {confirmPassword.length > 0 && !confirmMatches && (
            <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Passwords don&apos;t match
            </p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800">{serverError}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-ruby-600 hover:bg-ruby-700 rounded-lg shadow-sm shadow-ruby-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === 'self' ? 'Changing…' : 'Resetting…'}
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                {mode === 'self' ? 'Change password' : 'Reset password'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
