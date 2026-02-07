'use client';

import { useState } from 'react';
import Image from 'next/image';
import ScrollReveal from '../landing/ScrollReveal';

export default function ContactForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    service: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: handle form submission
  };

  return (
    <section className="py-16 sm:py-20 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Label */}
        <ScrollReveal>
          <p className="text-xs text-ruby-red font-medium mb-1">✦ Contact</p>
          <div className="w-full h-px bg-gray-200 mb-10" />
        </ScrollReveal>

        <div className="flex flex-col lg:flex-row items-stretch gap-12 lg:gap-16">
          {/* Left — Form */}
          <div className="flex-1">
            <ScrollReveal>
              <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-ruby-black mb-2">
                Contact us
              </h2>
              <p className="text-sm text-gray-500 mb-8">
                We are here to help you make a first move to greener choice.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={1}>
              <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-ruby-black mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-ruby-red transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ruby-black mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-ruby-red transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ruby-black mb-1.5">
                    Company <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-ruby-red transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ruby-black mb-1.5">
                    Service
                  </label>
                  <select
                    name="service"
                    value={form.service}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-ruby-red transition-colors text-gray-500 bg-white"
                    required
                  >
                    <option value="">Select service</option>
                    <option value="partnership">Partnership</option>
                    <option value="advertising">Advertising</option>
                    <option value="listing">Business Listing</option>
                    <option value="support">General Support</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn-ruby w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-ruby-red text-white text-sm font-semibold rounded-lg"
                >
                  Submit
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </form>
            </ScrollReveal>
          </div>

          {/* Right — Image */}
          <div className="flex-1 hidden lg:flex items-center justify-center">
            <ScrollReveal delay={2}>
              <div className="rounded-2xl overflow-hidden w-full max-w-md">
                <Image
                  src="/images/hero.png"
                  alt="Contact Ruby+"
                  width={500}
                  height={600}
                  className="w-full h-[500px] object-cover"
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}