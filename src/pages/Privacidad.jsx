import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield } from 'lucide-react';
import { ESTUDIO } from '../config/estudio';

function Privacidad() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--app-bg)', fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <div style={{ 
        padding: 'max(20px, env(safe-area-inset-top, 20px)) 20px 15px 20px', display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'white',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div onClick={() => navigate(-1)} style={{ 
          width: '38px', height: '38px', borderRadius: '50%', 
          background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }}>
          <ChevronLeft size={20} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={18} color="var(--primary)" />
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Política de Privacidad</h1>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem', lineHeight: 1.8, fontSize: '0.92rem', color: '#374151' }}>
        <p style={{ color: '#6B7280', fontSize: '0.8rem', marginBottom: '2rem' }}>Última actualización: Mayo 2026</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginBottom: '0.5rem' }}>1. Responsable del Tratamiento</h2>
        <p><strong>{ESTUDIO.nombre}</strong> (en adelante "el Responsable") con domicilio en {ESTUDIO.legal.domicilio}, es responsable del tratamiento de tus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>2. Datos que Recopilamos</h2>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Nombre completo</li>
          <li>Correo electrónico</li>
          <li>Número de teléfono (opcional)</li>
          <li>Datos de membresía y asistencia a clases</li>
          <li>Contacto de emergencia (opcional)</li>
          <li>Foto de perfil (opcional, almacenada de forma segura)</li>
        </ul>
        <p><strong>No recopilamos</strong> datos financieros, bancarios ni de tarjetas de crédito.</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>3. Datos de Salud (Health Connect)</h2>
        <p>Con tu consentimiento explícito, {ESTUDIO.nombre} utiliza <strong>Health Connect de Google</strong> para acceder a los siguientes datos de salud almacenados en tu dispositivo:</p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li><strong>Lectura:</strong> pasos diarios, calorías activas quemadas, y tu peso y porcentaje de grasa corporal (si usas una báscula que los envíe a Health Connect), para mostrarte tu evolución.</li>
          <li><strong>Escritura:</strong> las calorías quemadas durante tu clase.</li>
        </ul>
        <p>Estos datos se procesan localmente en tu dispositivo y se muestran únicamente dentro de la app para visualización personal. <strong>Nunca compartimos, vendemos ni transferimos tus datos de salud a terceros, anunciantes ni servidores externos.</strong> Puedes revocar el acceso en cualquier momento desde la app de Health Connect o en Configuración → Salud y Forma física.</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>4. Otros Permisos del Dispositivo</h2>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li><strong>Cámara y galería:</strong> únicamente para que tomes o selecciones tu foto de perfil.</li>
          <li><strong>Calendario:</strong> con tu consentimiento, agregamos tus clases reservadas al calendario de tu dispositivo. No leemos otros eventos.</li>
          <li><strong>Notificaciones:</strong> recordatorios de tus clases, confirmaciones de reserva y avisos del estudio.</li>
        </ul>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>5. Finalidad del Tratamiento</h2>
        <p>Tus datos personales serán utilizados para las siguientes finalidades:</p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Gestión de tu cuenta y membresía activa.</li>
          <li>Administración de reservas y asistencia a clases.</li>
          <li>Comunicaciones operativas del estudio (horarios, cambios, avisos).</li>
          <li>Mejora continua de nuestros servicios y experiencia de usuario.</li>
        </ul>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>6. Transferencias Internacionales</h2>
        <p>Tus datos son almacenados en servidores de <strong>Supabase Inc.</strong> (infraestructura de Amazon Web Services) ubicados en Estados Unidos. Esta transferencia se realiza bajo medidas de seguridad equivalentes a las exigidas por la LFPDPPP.</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>7. Derechos ARCO</h2>
        <p>Tienes derecho a <strong>Acceder, Rectificar, Cancelar u Oponerte</strong> al tratamiento de tus datos personales. Para ejercer cualquiera de estos derechos:</p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Desde la app: Sección "Mi Cuenta" → "Ajustes" → "Eliminar Cuenta".</li>
          <li>Por correo electrónico: <strong>contacto@befitlab.com</strong></li>
        </ul>
        <p>Tu solicitud será atendida en un plazo máximo de 20 días hábiles.</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>8. Retención de Datos</h2>
        <p>Tus datos serán conservados mientras mantengas una cuenta activa. Al solicitar la eliminación de tu cuenta, tus datos serán eliminados permanentemente de nuestros sistemas en un plazo de 30 días.</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>9. Medidas de Seguridad</h2>
        <p>Implementamos las siguientes medidas técnicas y organizativas:</p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Cifrado de contraseñas mediante algoritmos hash seguros.</li>
          <li>Comunicaciones cifradas mediante HTTPS/TLS.</li>
          <li>Control de acceso basado en roles (Row Level Security).</li>
          <li>Autenticación segura con tokens JWT.</li>
        </ul>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>10. Cookies y Tecnologías</h2>
        <p>Esta aplicación utiliza almacenamiento local del navegador (localStorage) exclusivamente para mantener tu sesión activa y tus preferencias de configuración. No utilizamos cookies de terceros ni tecnologías de rastreo publicitario.</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>11. Modificaciones</h2>
        <p>Nos reservamos el derecho de modificar esta política en cualquier momento. Los cambios serán notificados a través de la aplicación.</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>12. Contacto</h2>
        <p>Para cualquier consulta sobre esta política de privacidad, escríbenos a: <strong>contacto@befitlab.com</strong></p>

        <div style={{ marginTop: '3rem', padding: '20px', background: 'rgba(255,145,77,0.06)', borderRadius: '16px', border: '1px solid rgba(255,145,77,0.15)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, margin: 0 }}>{ESTUDIO.nombre} © {new Date().getFullYear()} — Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}

export default Privacidad;
