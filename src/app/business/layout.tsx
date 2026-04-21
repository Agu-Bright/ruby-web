import { ToastProvider } from '@/components/ui';

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastProvider />
    </>
  );
}
