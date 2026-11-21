// ECONVYX AI — Reset Password Page

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Logo } from '../../components/brand/Logo.js';
import { useToast } from '../../context/ToastContext.js';
import { api } from '../../lib/api.js';
import { Eye, EyeOff, Lock, Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();

  const token = searchParams.get('token') || '';

  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setIsVerifying(false);
        setIsValidToken(false);
        return;
      }
      try {
        const res = await api.verifyResetToken(token);
        if (res.valid) {
          setIsValidToken(true);
          setTargetEmail(res.email);
        }
      } catch {
        setIsValidToken(false);
      } finally {
        setIsVerifying(false);
      }
    };
    verify();
  }, [token]);

  const passwordStrength = (() => {
    if (newPassword.length === 0) return { score: 0, label: '', color: '' };
    if (newPassword.length < 8) return { score: 1, label: 'Too short (min 8 chars)', color: 'text-rose-500' };
    const hasNum = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    if (hasNum && hasSpecial) return { score: 3, label: 'Strong password', color: 'text-emerald-400' };
    if (hasNum || hasSpecial) return { score: 2, label: 'Medium strength', color: 'text-amber-400' };
    return { score: 2, label: 'Add numbers or symbols', color: 'text-amber-400' };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      addToast({
        type: 'warning',
        title: 'Password Too Short',
        message: 'Password must be at least 8 characters long.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast({
        type: 'warning',
        title: 'Passwords Do Not Match',
        message: 'Please ensure both passwords match identically.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await api.resetPassword(token, newPassword);
      setIsCompleted(true);
      addToast({
        type: 'success',
        title: 'Password Reset',
        message: 'Your password has been reset successfully. Please sign in.',
      });
      setTimeout(() => {
        navigate('/signin');
      }, 2000);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Reset Failed',
        message: err.message || 'Failed to reset password. Link may have expired.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050722] flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <Logo variant="transparent" size="lg" layout="stacked" />
        </div>
        <p className="text-sm text-[#69E0D0] font-medium tracking-wide mt-1">
          Turn financial complexity into clarity.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[#101C2C] py-8 px-6 shadow-2xl rounded-2xl border border-[#17283D] sm:px-10 space-y-6">
          {isVerifying ? (
            <div className="text-center py-8 space-y-3">
              <Loader2 className="w-8 h-8 text-[#12B8A6] animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Verifying secure reset link...</p>
            </div>
          ) : !isValidToken ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Reset Link Expired or Invalid</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                This password reset link has expired or has already been used. Please request a new link to reset your password.
              </p>
              <div className="pt-2">
                <Link
                  to="/forgot-password"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#12B8A6] hover:bg-[#0D9488] text-white font-semibold rounded-xl text-xs transition-colors"
                >
                  <span>Request New Reset Link</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : isCompleted ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 bg-teal-500/10 border border-teal-500/20 text-[#12B8A6] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Password Reset Complete!</h2>
              <p className="text-xs text-slate-300">
                Your password has been updated. Redirecting you to sign in...
              </p>
              <div className="pt-2">
                <Link
                  to="/signin"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#12B8A6] hover:text-[#69E0D0] transition-colors"
                >
                  <span>Click here to sign in now &rarr;</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-lg font-bold text-white">Set new password</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Resetting password for <strong className="text-white">{targetEmail}</strong>
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full px-3.5 py-2.5 pr-10 text-sm bg-[#17283D] border border-[#1E3A56] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#12B8A6] focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword.length > 0 && (
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className={passwordStrength.color}>{passwordStrength.label}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`w-6 h-1 rounded-full ${
                              level <= passwordStrength.score
                                ? passwordStrength.score === 1
                                  ? 'bg-rose-500'
                                  : passwordStrength.score === 2
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-400'
                                : 'bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3.5 py-2.5 pr-10 text-sm bg-[#17283D] border border-[#1E3A56] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#12B8A6] focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                    <p className="mt-1 text-[11px] text-rose-400">Passwords do not match.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || newPassword.length < 8 || newPassword !== confirmPassword}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#12B8A6] to-[#0D9488] hover:from-[#0D9488] hover:to-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#12B8A6] shadow-lg shadow-[#12B8A6]/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Reset Password</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="pt-2 text-center border-t border-[#17283D]">
            <Link
              to="/signin"
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
