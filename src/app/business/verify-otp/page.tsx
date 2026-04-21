'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ApiClientError } from '@/lib/api/client';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no email
  useEffect(() => {
    if (!email) router.replace('/business/register');
  }, [email, router]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, []);

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.max(3, b.length)) + c);

  const handleChange = (text: string, index: number) => {
    // Handle pasted full OTP
    if (text.length === OTP_LENGTH) {
      const digits = text.replace(/\D/g, '').split('').slice(0, OTP_LENGTH);
      setOtp(digits.concat(Array(OTP_LENGTH - digits.length).fill('')));
      inputRefs.current[Math.min(OTP_LENGTH - 1, digits.length - 1)]?.focus();
      return;
    }

    const digit = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setSubmitting(true);
    try {
      await api.auth.verifyBusinessOtp({ email, otp: code });
      toast.success('Email verified!');
      router.replace('/business/success');
    } catch (err) {
      const apiErr = err as ApiClientError;
      const message = apiErr?.message || 'Invalid or expired code. Please try again.';
      toast.error(message);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await api.auth.resendBusinessOtp({ email });
      toast.success('A new code has been sent to your email');
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      const apiErr = err as ApiClientError;
      toast.error(apiErr?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const isOtpComplete = otp.every((d) => d !== '');
  const formatCooldown = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/images/logo.png" alt="Ruby+" width={110} height={36} className="h-9 w-auto object-contain" priority />
          </Link>
          <Link href="/business/register" className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-ruby-red/10 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-ruby-red" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Verify your email</h1>
            <p className="text-gray-600">
              Enter the 6-digit code we sent to
              <br />
              <span className="font-semibold text-gray-900">{maskedEmail}</span>
            </p>
          </div>

          <form onSubmit={handleVerify}>
            <div className="flex justify-between gap-2 mb-8">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={index === 0 ? OTP_LENGTH : 1}
                  value={digit}
                  onChange={(e) => handleChange(e.target.value, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-ruby-red focus:outline-none focus:ring-2 focus:ring-ruby-red/20 text-gray-900 bg-white transition-all"
                  disabled={submitting}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={!isOtpComplete || submitting}
              className="w-full bg-ruby-red text-white font-semibold py-3.5 rounded-lg hover:bg-ruby-red/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mb-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify email'
              )}
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Didn&apos;t receive the code?{' '}
                {cooldown > 0 ? (
                  <span className="text-gray-400">Resend in {formatCooldown(cooldown)}</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-ruby-red font-medium hover:underline disabled:opacity-50"
                  >
                    {resending ? 'Sending...' : 'Resend code'}
                  </button>
                )}
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function BusinessVerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-ruby-red" /></div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}
