import './globals.css';
import type { ReactNode } from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Learning OS — YTS v2',
  description: 'A personal robotics & control-science learning OS.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="brand">
              Learning OS
              <small>Robotics · Control</small>
            </div>
            <nav className="nav">
              <Link href="/"><span className="dot" />Dashboard</Link>
              <Link href="/concepts"><span className="dot" />Concepts</Link>
              <Link href="/projects"><span className="dot" />Projects</Link>
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
