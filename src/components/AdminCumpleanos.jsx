import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BirthdayCalendar } from '../pages/Cumpleanos';

// Pestaña "Cumpleaños" del admin: el MISMO calendario que ven las clientas
// (vista año → mes → detalle del día), reutilizado vía <BirthdayCalendar/>.
export default function AdminCumpleanos() {
  const { user } = useAuth();
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--black)' }}>Cumpleaños</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>Clientas, coaches y staff</span>
      </div>
      <BirthdayCalendar currentUserId={user?.id} />
    </section>
  );
}
