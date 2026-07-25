'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

export function BusinessPwaInstall() {
  const pathname = usePathname();
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;
    const inspectInstallingWorker = () => {
      const worker = registration?.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) setWaitingWorker(worker);
      });
    };
    const watchRegistration = (value: ServiceWorkerRegistration) => {
      registration = value;
      registrationRef.current = value;
      inspectInstallingWorker();
      value.addEventListener('updatefound', inspectInstallingWorker);
      void value.update();
    };
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    void navigator.serviceWorker.register('/business-sw.js').then(watchRegistration).catch(() => undefined);
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      registration?.removeEventListener('updatefound', inspectInstallingWorker);
      registrationRef.current = null;
    };
  }, []);
  useEffect(() => {
    if (pathname) void registrationRef.current?.update();
  }, [pathname]);

  const install = async () => {
    if (!prompt) { toast.message('Use your browser menu to install Ruby+ Business'); return; }
    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === 'accepted') toast.success('Ruby+ Business is installing');
    setPrompt(null);
  };
  const refresh = () => { waitingWorker?.postMessage({ type: 'SKIP_WAITING' }); window.location.reload(); };

  if (waitingWorker) return <button type="button" onClick={refresh} className="inline-flex items-center gap-1.5 rounded-lg bg-ruby-red px-2.5 py-2 text-xs font-semibold text-white" aria-label="Refresh to update Ruby+ Business"><RefreshCw size={16} /><span className="hidden sm:inline">Refresh</span></button>;
  return <button type="button" onClick={() => void install()} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50" aria-label="Install Ruby+ Business"><Download size={16} /><span className="hidden sm:inline">{prompt ? 'Install app' : 'Install'}</span></button>;
}
