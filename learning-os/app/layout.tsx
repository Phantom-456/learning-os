import './globals.css';
import type { ReactNode } from 'react';
import GameNav from '@/components/GameNav';

export const metadata = {
  title: 'Mystic Quest OS',
  description: 'A gamified learning OS.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let t = localStorage.getItem('learning-os-theme');
                if (!t) t = 'rustic-castle';
                document.documentElement.setAttribute('data-theme', t);
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body>
        <div className="shell">
          <GameNav />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
