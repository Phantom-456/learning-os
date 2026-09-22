'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Settings, Map, BookOpen, LayoutDashboard } from 'lucide-react';
import ThemeManager from './ThemeManager';

export default function GameNav() {
  const [open, setOpen] = useState(false);
  
  // Close menu on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <>
      {/* Floating Hamburger Button */}
      <button 
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', top: '20px', left: '20px', zIndex: 1000,
          background: 'var(--panel)', border: '2px solid var(--accent)',
          borderRadius: '50%', width: '56px', height: '56px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          cursor: 'pointer', color: 'var(--accent)',
          backgroundImage: 'var(--bg-parchment, none)',
          backgroundSize: 'cover', backgroundBlendMode: 'overlay'
        }}
        aria-label="Open Menu"
      >
        <Menu size={28} />
      </button>

      {/* Game Menu Overlay */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          backgroundImage: 'var(--bg-castle, none)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          backgroundBlendMode: 'multiply'
        }}>
          
          <button 
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute', top: '24px', right: '24px',
              background: 'none', border: 'none', color: 'var(--accent)',
              cursor: 'pointer'
            }}
          >
            <X size={40} />
          </button>

          <h1 style={{ 
            fontFamily: 'var(--serif)', fontSize: '48px', color: 'var(--accent)',
            textShadow: '0 4px 10px rgba(0,0,0,0.8)', marginBottom: '40px'
          }}>
            Mystic Quest OS
          </h1>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '300px' }}>
            <Link href="/" onClick={() => setOpen(false)} className="game-btn">
              <LayoutDashboard size={24} /> Dashboard
            </Link>
            <Link href="/concepts" onClick={() => setOpen(false)} className="game-btn">
              <BookOpen size={24} /> Concepts (Skill Tree)
            </Link>
            <Link href="/projects" onClick={() => setOpen(false)} className="game-btn">
              <Map size={24} /> Projects (World Map)
            </Link>
            
            <div style={{ marginTop: '20px' }}>
               <ThemeManager inMenu={true} />
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
