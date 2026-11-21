// ECONVYX AI — Forgot Password Page

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/brand/Logo.js';
import { useToast } from '../../context/ToastContext.js';
import { api } from '../../lib/api.js';
import { ArrowLeft, Mail, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      addToast({
        type: 'warning',
        title: 'Valid Email Required',
        message: 'Please provide a valid registered email address.',
      });
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.forgotPassword(email.trim());
      setIsSubmitted(true);
      if (res.resetUrl) {
        setResetUrl(res.resetUrl);
      }
      addToast({
        type: 'success',
        title: 'Instructions Sent',
        message: 'Password reset request has been processed.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Request Failed',
        message: err.message || 'Unable to process password reset.',
      });
    } finally {
      setIsLoading(false);
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
          {!isSubmitted ? (
            <>
              <div className="text-center">
                <h2 className="text-lg font-bold text-white">Reset your password</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your registered work email and we'll send you secure instructions to reset your password.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@yourcompany.com"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#17283D] border border-[#1E3A56] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#12B8A6] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#12B8A6] to-[#0D9488] hover:from-[#0D9488] hover:to-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#12B8A6] shadow-lg shadow-[#12B8A6]/20 transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Verification Code...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Send 6-Digit OTP & Reset Link</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 bg-teal-500/10 border border-teal-500/20 text-[#12B8A6] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Verification Code Sent!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                We sent a <strong>6-digit OTP code</strong> and reset link to <strong className="text-white">{email}</strong>.
              </p>

              <div className="pt-2">
                <Link
                  to={`/reset-password?email=${encodeURIComponent(email)}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#12B8A6] to-[#0D9488] hover:from-[#0D9488] hover:to-[#0F766E] transition-all shadow-lg shadow-[#12B8A6]/20"
                >
                  <span>Enter 6-Digit OTP Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {resetUrl && (
                <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl text-left text-xs space-y-1.5 mt-2">
                  <p className="text-[11px] text-slate-400">
                    Or click direct link:
                  </p>
                  <Link
                    to={resetUrl}
                    className="text-[#69E0D0] hover:underline text-xs flex items-center gap-1 font-medium"
                  >
                    <span>Reset with 1-click token</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 text-center border-t border-[#17283D]">
            <Link
              to="/signin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
