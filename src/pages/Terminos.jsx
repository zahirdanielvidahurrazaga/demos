import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText } from 'lucide-react';
import { ESTUDIO } from '../config/estudio';

function Terminos() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--app-bg)', fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <div style={{ 
        padding: 'max(20px, env(safe-area-inset-top, 20px)) 20px 15px 20px', display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'white',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--surface-lowest)', border: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer' }}
        >
          <ChevronLeft size={20} color="var(--black)" />
        </button>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--black)' }}>Términos y Condiciones</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', margin: 0 }}>{ESTUDIO.nombre}</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 20px', fontSize: '0.9rem', color: '#564338', lineHeight: 1.7 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem', padding: '16px', background: 'white', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(126,86,46,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={24} color="#A19289" />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#1A1C1E' }}>Información Legal</h2>
            <p style={{ fontSize: '0.8rem', color: '#8C8079', margin: '4px 0 0' }}>Última actualización: Mayo 2026</p>
          </div>
        </div>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginBottom: '0.5rem' }}>1. Información General e Identificación</h2>
        <p><strong>{ESTUDIO.nombre}</strong> | Operador: {ESTUDIO.legal.razonSocial}</p>
        <p><strong>Nos encontramos en:</strong> {ESTUDIO.contacto.direccion.join(' ')}</p>
        <p><strong>Horarios de atención:</strong>{ESTUDIO.contacto.horarios.map((h) => (
          <React.Fragment key={h}><br/>{h}</React.Fragment>
        ))}</p>
        <p><strong>Contacto oficial:</strong><br/>Email: {ESTUDIO.contacto.email}<br/>Instagram: {ESTUDIO.contacto.instagram}<br/>Teléfono/WhatsApp: {ESTUDIO.contacto.telefono}</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>2. Ámbito de Aplicación y Aceptación</h2>
        <p>Este documento (&quot;Términos y Condiciones&quot;) regula el acceso, registro y uso de la plataforma digital (App y Web) así como la asistencia física a las instalaciones de {ESTUDIO.nombre}. Al crear una cuenta y/o asistir a nuestras clases, declaras expresamente haber leído, entendido y aceptado este acuerdo en su totalidad.</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>3. Definiciones</h2>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li style={{ marginBottom: '8px' }}><strong>Usuario/Alumno:</strong> Persona física que se registra en la plataforma y adquiere créditos para tomar clases.</li>
          <li style={{ marginBottom: '8px' }}><strong>Coach:</strong> Instructor calificado encargado de dirigir las sesiones físicas.</li>
          <li style={{ marginBottom: '8px' }}><strong>Crédito:</strong> Unidad de valor adquirida a través de la plataforma que permite reservar una (1) clase.</li>
          <li style={{ marginBottom: '8px' }}><strong>Membresía:</strong> Paquete de créditos con una vigencia temporal determinada.</li>
        </ul>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>4. Registro, Acceso y Uso de la Plataforma</h2>
        <p>El registro requiere proporcionar datos precisos, actuales y completos. El Usuario es el único responsable de mantener la confidencialidad de sus credenciales de acceso. {ESTUDIO.nombre} no será responsable por el uso indebido de las cuentas derivadas del descuido del Usuario.</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>5. Normas de Conducta y Uso de las Instalaciones</h2>
        <p>Para garantizar una experiencia segura y armónica, se exige:</p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li style={{ marginBottom: '8px' }}>Uso obligatorio de ropa deportiva adecuada y <strong>calcetines antiderrapantes</strong> (por motivos de higiene y seguridad).</li>
          <li style={{ marginBottom: '8px' }}>Puntualidad: Recomendamos llegar 5-10 minutos antes. <strong>Bajo ninguna circunstancia se permitirá el acceso a la clase una vez iniciada</strong>, sin excepciones. La clase se dará por perdida.</li>
          <li style={{ marginBottom: '8px' }}>Queda estrictamente prohibida cualquier conducta de agresión física, verbal, discriminación o acoso hacia el personal u otros usuarios. {ESTUDIO.nombre} se reserva el derecho de admisión y revocación permanente del acceso a las instalaciones y la plataforma (sin derecho a reembolso) en caso de infringir esta norma.</li>
        </ul>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>6. Medidas Sanitarias</h2>
        <p>El Usuario se compromete a no asistir a las instalaciones si presenta síntomas de enfermedades contagiosas. {ESTUDIO.nombre} mantiene estrictos protocolos de limpieza y desinfección de equipos entre cada clase.</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>7. Derechos y Obligaciones del Usuario</h2>
        <p>El Usuario tiene derecho a recibir el servicio en los horarios publicados, siempre que cuente con créditos activos y haya realizado su reserva exitosamente. Es obligación del Usuario acatar las instrucciones de los coaches en todo momento para evitar lesiones.</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>8. Condiciones de Compra y Pagos</h2>
        <p>Los precios están sujetos a cambio sin previo aviso. Los paquetes y membresías adquiridos son <strong>estrictamente personales e intransferibles</strong>. Ningún paquete, promoción o crédito individual es reembolsable ni en efectivo ni en tarjeta, sin importar la razón (incluyendo situaciones médicas o mudanzas).</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>9. Políticas de Cancelación de Clases</h2>
        <p>Toda cancelación de clase debe realizarse directamente a través de la aplicación con un mínimo de <strong>5 horas de anticipación</strong> al horario de inicio de dicha sesión. Si la cancelación se realiza fuera de este periodo, o en caso de inasistencia (No-Show), <strong>el crédito será descontado automáticamente de su membresía y no será reembolsado ni reprogramado</strong>.</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>10. Responsabilidad y Asunción de Riesgos</h2>
        <p>La práctica de ejercicio físico conlleva riesgos inherentes. Al asistir a las clases, el Usuario declara estar en condiciones físicas y de salud aptas. {ESTUDIO.nombre}, sus socios, instructores y empleados no se hacen responsables por accidentes, lesiones o eventos de salud derivados de la práctica deportiva, el uso del equipo, o por no seguir las indicaciones del coach.</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>11. Protección de Datos y Privacidad</h2>
        <p>Tus datos son tratados con estricta confidencialidad. Para más detalles, consulta nuestro Aviso de Privacidad en la sección de Ajustes de la App.</p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1C1E', marginTop: '2rem', marginBottom: '0.5rem' }}>12. Terminación del Acuerdo</h2>
        <p>El Usuario puede solicitar la eliminación de su cuenta en cualquier momento desde la App (Configuración &gt; Eliminar Cuenta). La eliminación es irreversible y resultará en la pérdida de los créditos restantes sin derecho a reembolso.</p>

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, margin: 0 }}>{ESTUDIO.nombre} © {new Date().getFullYear()} - Todos los derechos reservados.</p>
        </div>

      </div>
    </div>
  );
}

export default Terminos;
