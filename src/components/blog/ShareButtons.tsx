'use client';

import { useEffect, useState } from 'react';
import { Link2, Check, Twitter, Facebook, Linkedin, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

/** Social share row for an article. Uses the live page URL on the client. */
export function ShareButtons({ title }: { title: string }) {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  const enc = (s: string) => encodeURIComponent(s);
  const targets = [
    { label: 'Share on X', icon: Twitter, href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}` },
    { label: 'Share on WhatsApp', icon: MessageCircle, href: `https://wa.me/?text=${enc(`${title} ${url}`)}` },
    { label: 'Share on Facebook', icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: 'Share on LinkedIn', icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-semibold text-gray-500">Share</span>
      {targets.map((t) => (
        <a
          key={t.label}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t.label}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-ruby-red hover:text-ruby-red"
        >
          <t.icon className="h-4 w-4" />
        </a>
      ))}
      <button
        onClick={copy}
        aria-label="Copy link"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-ruby-red hover:text-ruby-red"
      >
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
