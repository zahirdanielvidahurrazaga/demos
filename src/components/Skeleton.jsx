/**
 * Skeleton — placeholders de carga reutilizables con shimmer.
 *
 * Usa los tokens de tema (claro/oscuro) de index.css, así que se ve bien en
 * ambos modos sin tocar nada. El shimmer es CSS puro (keyframes `befit-shimmer`
 * en index.css) → sin dependencias ni JS por frame.
 *
 * Uso:
 *   <Skeleton w="60%" h={18} r={8} />            // bloque individual
 *   <ClassListSkeleton />                         // lista de clases (Agenda)
 *   <RecipeGridSkeleton />                         // grid de recetas (Nutrición)
 *   <CafeMenuSkeleton />                           // menú de cafetería
 */

export function Skeleton({ w = '100%', h = 14, r = 8, style = {} }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'block',
        width: typeof w === 'number' ? `${w}px` : w,
        height: typeof h === 'number' ? `${h}px` : h,
        borderRadius: typeof r === 'number' ? `${r}px` : r,
        background:
          'linear-gradient(100deg, var(--fill-subtle) 30%, var(--surface-elevated) 50%, var(--fill-subtle) 70%)',
        backgroundSize: '200% 100%',
        animation: 'befit-shimmer 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

/* ---- Agenda: lista de clases ---- */
export function ClassListSkeleton({ rows = 4 }) {
  return (
    <div aria-busy="true" aria-label="Cargando clases" style={{ display: 'grid', gap: 12 }}>
      {/* fila de pestañas de día */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} w={56} h={64} r={16} />
        ))}
      </div>
      {/* tarjetas de clase */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: 16,
            borderRadius: 20,
            background: 'var(--app-surface-solid)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <Skeleton w={52} h={52} r={14} />
          <div style={{ flex: 1, display: 'grid', gap: 8 }}>
            <Skeleton w="55%" h={16} />
            <Skeleton w="35%" h={12} />
          </div>
          <Skeleton w={70} h={34} r={12} />
        </div>
      ))}
    </div>
  );
}

/* ---- Nutrición: grid de recetas ---- */
export function RecipeGridSkeleton({ count = 4 }) {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando recetas"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 14,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            borderRadius: 18,
            overflow: 'hidden',
            background: 'var(--app-surface-solid)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <Skeleton w="100%" h={110} r={0} />
          <div style={{ padding: 12, display: 'grid', gap: 8 }}>
            <Skeleton w="80%" h={14} />
            <Skeleton w="50%" h={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- Cafetería: pestañas + tarjetas de menú ---- */
export function CafeMenuSkeleton({ count = 3 }) {
  return (
    <div aria-busy="true" aria-label="Cargando menú">
      {/* pestañas de categoría */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, justifyContent: 'center' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} w={96} h={38} r={20} />
        ))}
      </div>
      {/* tarjetas de producto */}
      <div style={{ display: 'grid', gap: 14 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: 14,
              borderRadius: 20,
              background: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(80,50,30,0.08)',
            }}
          >
            <Skeleton w={72} h={72} r={16} />
            <div style={{ flex: 1, display: 'grid', gap: 9 }}>
              <Skeleton w="60%" h={15} />
              <Skeleton w="85%" h={11} />
              <Skeleton w="30%" h={13} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
