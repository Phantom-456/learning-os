'use client';

import { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';

export default function ThemeManager({ inMenu = false }: { inMenu?: boolean }) {
  const [theme, setTheme] = useState('rustic-castle');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('learning-os-theme');
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      document.documentElement.setAttribute('data-theme', 'rustic-castle');
    }
  }, []);

  function handleTheme(t: string) {
    setTheme(t);
    localStorage.setItem('learning-os-theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }

  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        className={inMenu ? "game-btn" : "btn ghost"} 
        style={inMenu ? {} : { width: '100%', display: 'flex', gap: '8px', alignItems: 'center' }}
      >
        <Settings size={inMenu ? 24 : 16} /> Settings
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', 
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: '24px', width: '400px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)', position: 'relative',
            backgroundImage: 'var(--bg-parchment, none)',
            backgroundSize: 'cover', backgroundBlendMode: 'overlay'
          }}>
            <button 
              onClick={() => setOpen(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            <h2 style={{ margin: '0 0 20px', fontSize: '24px', fontFamily: 'var(--serif)', color: 'var(--text)' }}>Appearance</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text)', fontSize: '18px' }}>
                <input 
                  type="radio" name="theme" value="rustic-castle" 
                  checked={theme === 'rustic-castle'} 
                  onChange={() => handleTheme('rustic-castle')} 
                  style={{ transform: 'scale(1.2)' }}
                />
                Fairy Tale Castle (Default)
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text)', fontSize: '18px' }}>
                <input 
                  type="radio" name="theme" value="dark" 
                  checked={theme === 'dark'} 
                  onChange={() => handleTheme('dark')}
                  style={{ transform: 'scale(1.2)' }} 
                />
                Dark Classic
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text)', fontSize: '18px' }}>
                <input 
                  type="radio" name="theme" value="light" 
                  checked={theme === 'light'} 
                  onChange={() => handleTheme('light')} 
                  style={{ transform: 'scale(1.2)' }}
                />
                Light Mode
              </label>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
