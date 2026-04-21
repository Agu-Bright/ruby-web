'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, Check, ShoppingBag, Calendar, Wallet, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ApiClientError } from '@/lib/api/client';

interface FormState {
  email: string;
  password: string;
  phone: string;
  agree: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  phone?: string;
  agree?: string;
}

export default function BusinessRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ email: '', password: '', phone: '', agree: false });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.email) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Invalid email address';

    if (!form.password) next.password = 'Password is required';
    else if (form.password.length < 8) next.password = 'Password must be at least 8 characters';
    else if (form.password.length > 50) next.password = 'Password must be 50 characters or less';
    else if (!/[A-Z]/.test(form.password)) next.password = 'Must include an uppercase letter';
    else if (!/[a-z]/.test(form.password)) next.password = 'Must include a lowercase letter';
    else if (!/[0-9]/.test(form.password)) next.password = 'Must include a number';
    else if (!/[@$!%*?&]/.test(form.password)) next.password = 'Must include a special character (@ $ ! % * ? &)';

    if (form.phone && form.phone.replace(/\D/g, '').length < 10) {
      next.phone = 'Enter a valid phone number';
    }

    if (!form.agree) next.agree = 'You must agree to the terms';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await api.auth.registerBusiness({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone ? form.phone.trim() : undefined,
      });
      // Backend sends OTP to email — move to verification
      router.push(`/business/verify-otp?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
    } catch (err) {
      const apiErr = err as ApiClientError;
      const message = apiErr?.message || 'Registration failed. Please try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/images/logo.png" alt="Ruby+" width={110} height={36} className="h-9 w-auto object-contain" priority />
          </Link>
          <div className="text-sm text-gray-600">
            Already have an account?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); toast.info('Please open the Ruby+ Business app on your phone to sign in.'); }} className="text-ruby-red font-medium hover:underline">
              Sign in on mobile app
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Left: Benefits / marketing */}
        <aside className="hidden lg:flex flex-col justify-center px-12 py-16 bg-gradient-to-br from-ruby-red/10 via-pink-50 to-orange-50">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4">
              Grow your business with Ruby+
            </h1>
            <p className="text-gray-600 text-lg mb-10">
              Join thousands of Nigerian businesses reaching diaspora customers and tourists through Ruby+. Free to register, pay only on transactions.
            </p>

            <ul className="space-y-5">
              {[
                { icon: ShoppingBag, title: 'Reach more customers', desc: 'Get discovered by people searching for your services.' },
                { icon: Calendar, title: 'Manage orders & bookings', desc: 'Accept, track, and fulfill all from one simple dashboard.' },
                { icon: Wallet, title: 'Accept payments easily', desc: 'QR codes, transfers, and merchant codes — all instant.' },
                { icon: BarChart3, title: 'Track your earnings', desc: 'Real-time wallet, sales analytics, and automatic payouts.' },
              ].map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-ruby-red" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-600 mt-0.5">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Right: Form */}
        <section className="flex items-center justify-center px-6 py-12 lg:px-16">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Create your business account</h2>
              <p className="text-gray-600">
                Takes 2 minutes. You&apos;ll complete the rest on the Ruby+ Business app.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Business email *
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="you@business.com"
                  autoComplete="email"
                  className={`w-full px-4 py-3 rounded-lg border text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ruby-red/30 focus:border-ruby-red transition-colors ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                  disabled={submitting}
                />
                {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    placeholder="Strong password"
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 pr-11 rounded-lg border text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ruby-red/30 focus:border-ruby-red transition-colors ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>
                ) : (
                  <p className="mt-1.5 text-xs text-gray-500">8+ chars. Must include uppercase, lowercase, number, and one of: @ $ ! % * ? &amp;</p>
                )}
              </div>

              {/* Phone (optional) */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+234 800 000 0000"
                  autoComplete="tel"
                  className={`w-full px-4 py-3 rounded-lg border text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ruby-red/30 focus:border-ruby-red transition-colors ${errors.phone ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                  disabled={submitting}
                />
                {errors.phone && <p className="mt-1.5 text-xs text-red-600">{errors.phone}</p>}
              </div>

              {/* Terms checkbox */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.agree}
                    onChange={(e) => updateField('agree', e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-ruby-red rounded border-gray-300 focus:ring-ruby-red"
                    disabled={submitting}
                  />
                  <span className="text-sm text-gray-600">
                    I agree to the{' '}
                    <Link href="/terms" target="_blank" className="text-ruby-red font-medium hover:underline">Terms of Service</Link>{' '}
                    and{' '}
                    <Link href="/privacy" target="_blank" className="text-ruby-red font-medium hover:underline">Privacy Policy</Link>
                  </span>
                </label>
                {errors.agree && <p className="mt-1.5 text-xs text-red-600 ml-7">{errors.agree}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-ruby-red text-white font-semibold py-3.5 rounded-lg hover:bg-ruby-red/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                  </>
                )}
              </button>

              {/* Info: next step */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-0.5">After verification, complete setup on the app</p>
                  <p className="text-blue-800/80">
                    We&apos;ll send a code to your email to verify ownership. Then download the Ruby+ Business app to finish adding your business details.
                  </p>
                </div>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
