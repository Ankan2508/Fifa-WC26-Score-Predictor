import './globals.css';
import { Toaster } from '@/components/ui/sonner';

export const metadata = {
  title: 'WC26 Predictor — FIFA World Cup 2026 Predictions',
  description: 'Predict every World Cup 2026 match, build your bracket, and compete on the global leaderboard.',
  icons: { icon: '/logo.png', apple: '/logo.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0D0D0D] text-white antialiased">
        {children}
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
