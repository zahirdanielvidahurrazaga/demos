import React, { useState, useEffect } from 'react';
import { ChefHat, Flame, Clock, User, Calendar, Utensils, TrendingUp, CheckCircle2, Droplets, Play, QrCode, ChevronRight, Heart, Info, Scale, Wallet, X, Plus, Check } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QRCodeCanvas } from 'qrcode.react';
import { useScrollDetect } from '../hooks/useScrollDetect';
import { motion, AnimatePresence } from 'framer-motion';
import { addToAppleWallet, addToGoogleWallet, getWalletPlatform } from '../hooks/useWallet';
import ProfileMenu from '../components/ProfileMenu';
import ClientMealPlan from '../components/ClientMealPlan';
import NutritionToday from '../components/NutritionToday';
import CalorieTracker from '../components/CalorieTracker';
import { RecipeGridSkeleton } from '../components/Skeleton';
import { hasMealPlanAccess } from '../lib/plans';
import { ESTUDIO } from '../config/estudio';
import { crearIrA } from '../demo/navegacionDemo';

// Tipos de comida (mismo orden que en el panel de admin) para filtrar recetas
const MEAL_TIMES = ['Desayuno', 'Snack AM', 'Comida', 'Snack PM', 'Cena'];

function Nutricion() {
  const navigate = useNavigate();
  const { user, plan, recipes, recipesLoaded, classesRemaining, avatarUrl,
    favoriteRecipeIds, toggleRecipeFavorite, logFood, esDemo} = useAuth();
  // Dentro de la maqueta, navegar a una ruta real sacaría a la prospecta.
  const irA = crearIrA(navigate, esDemo);
  // Plan alimenticio personalizado solo para Fit y Premium; los demás ven recetas.
  const mealPlanAccess = hasMealPlanAccess(plan);
  const [showRecipe, setShowRecipe] = useState(false);
  const [recipeData, setRecipeData] = useState(null);
  const [recipeLogged, setRecipeLogged] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [activeCat, setActiveCat] = useState('Todas');
  // Fit/Premium: el recetario completo se oculta por defecto (su foco es su plan);
  // se puede abrir con "Ver recetario completo". Las demás clientas siempre lo ven.
  const [showRecipeBook, setShowRecipeBook] = useState(false);
  const walletPlatform = getWalletPlatform();
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletAdded, setWalletAdded] = useState(() => !!localStorage.getItem('befit_wallet_added'));
  const [walletError, setWalletError] = useState(null);

  const handleAddToWallet = async () => {
    if (!user?.id || walletLoading) return;
    setWalletLoading(true);
    setWalletError(null);
    const result = walletPlatform === 'google'
      ? await addToGoogleWallet(user.id)
      : await addToAppleWallet(user.id);
    setWalletLoading(false);
    if (result.success) {
      setWalletAdded(true);
      localStorage.setItem('befit_wallet_added', '1');
    } else {
      setWalletError(result.reason || 'Error desconocido');
    }
  };
  const isScrolled = useScrollDetect(30);

  // Bloquear el scroll del fondo cuando hay un drawer/sheet abierto (evita que
  // el gesto de scroll se "robe" hacia el fondo en iOS y rompa el scroll interno)
  useEffect(() => {
    const open = showRecipe || showQR;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showRecipe, showQR]);

  const handleMealClick = (meal) => {
    setRecipeData(meal);
    setRecipeLogged(false);
    setShowRecipe(true);
  };

  const handleLogFromDrawer = async () => {
    if (!recipeData) return;
    const row = await handleLogMeal(recipeData);
    if (row) { setRecipeLogged(true); setTimeout(() => setRecipeLogged(false), 1800); }
  };

  const handleFavorite = (id, e) => {
    e.stopPropagation();
    toggleRecipeFavorite(id);
  };

  // Registrar una receta como consumida hoy (diario de calorías)
  const handleLogMeal = (meal, e) => {
    if (e) e.stopPropagation();
    return logFood({ title: meal.title, kcal: meal.kcal, source: 'recipe', recipe_id: meal.id, meal_time: meal.time });
  };

  // Recetas globales + filtro por categoría / favoritas + receta destacada
  const meals = recipes || [];
  const hasFavorites = meals.some(m => favoriteRecipeIds.has(m.id));
  const categories = MEAL_TIMES.filter(t => meals.some(m => m.time === t));
  const filtered = activeCat === 'Todas'
    ? meals
    : activeCat === 'Favoritas'
      ? meals.filter(m => favoriteRecipeIds.has(m.id))
      : meals.filter(m => m.time === activeCat);
  const featured = activeCat === 'Todas' ? filtered[0] : null;
  const listMeals = featured ? filtered.slice(1) : filtered;

  return (
    <div className="mobile-app-container" style={{ background: 'var(--app-bg)' }}>
      {/* HEADER UNIFICADO */}
      <header className="ios-header" style={{ paddingBottom: '16px', background: 'transparent' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '0 0 3px', fontWeight: 600 }}>Plan Nutricional</p>
            <h1 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', margin: 0, lineHeight: 1.1, color: 'var(--on-surface)' }}>{ESTUDIO.nombreNutricion}</h1>
          </div>
          <ProfileMenu />
        </div>
      </header>

      <motion.main className="dashboard-main" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
        <div className="dashboard-sidebar">
          {/* Plan nutricional real + calendario mensual de comidas (solo Fit/Premium).
              El anuncio de upgrade para quienes NO tienen plan se movió al fondo,
              arriba de la información nutricional. */}
          {mealPlanAccess && (
            <ClientMealPlan userId={user?.id} onOpenRecipe={handleMealClick} />
          )}

          {/* TRACKER DE CALORÍAS CONSUMIDAS — para todas las clientas */}
          <CalorieTracker />

          {/* HIDRATACIÓN (rastreador de agua) */}
          <NutritionToday userId={user?.id} showMeals={false} />
        </div>

        <div className="dashboard-content">
          {/* Fit/Premium: recetario oculto por defecto (su foco es su plan del día) */}
          {mealPlanAccess && !showRecipeBook ? (
            <button onClick={() => setShowRecipeBook(true)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left',
              padding: '16px 18px', borderRadius: '20px', border: '1px solid var(--border-subtle)',
              background: 'var(--app-surface-solid)', boxShadow: 'var(--card-shadow)', cursor: 'pointer'
            }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '13px', background: 'rgba(255,145,77,0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ChefHat size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'var(--font-display)' }}>Ver recetario completo</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>Explora nuestras {meals.length} recetas saludables</div>
              </div>
              <ChevronRight size={20} color="var(--on-surface-variant)" />
            </button>
          ) : (
          <section id="tour-recetario">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
               <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'var(--font-display)' }}>Recetas saludables</h2>
               {mealPlanAccess ? (
                 <button onClick={() => setShowRecipeBook(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: 'none', background: 'transparent', color: 'var(--on-surface-variant)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>Ocultar</button>
               ) : (
                 <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,145,77,0.1)', padding: '6px 12px', borderRadius: '99px' }}>
                   <Utensils size={12} color="var(--primary)" />
                   <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800 }}>{meals.length}</span>
                 </div>
               )}
            </div>

            {/* Chips de filtro por tipo de comida (+ Favoritas) */}
            {(categories.length > 0 || hasFavorites) && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '20px', scrollbarWidth: 'none' }}>
                {['Todas', ...(hasFavorites ? ['Favoritas'] : []), ...categories].map(cat => {
                  const on = cat === activeCat;
                  return (
                    <button key={cat} onClick={() => setActiveCat(cat)} style={{
                      flexShrink: 0, padding: '8px 16px', borderRadius: '99px',
                      border: on ? 'none' : '1px solid var(--border-subtle)',
                      background: on ? 'var(--primary)' : 'var(--app-surface-solid)',
                      color: on ? '#fff' : 'var(--on-surface-variant)',
                      fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                      boxShadow: on ? '0 6px 16px rgba(255,139,66,0.3)' : 'none', transition: 'all 0.2s'
                    }}>
                      {cat === 'Favoritas'
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Heart size={12} fill={on ? '#fff' : 'transparent'} /> Favoritas</span>
                        : cat}
                    </button>
                  );
                })}
              </div>
            )}

            {meals.length === 0 && !recipesLoaded ? (
              <RecipeGridSkeleton />
            ) : meals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--on-surface-variant)', background: 'var(--app-surface-solid)', borderRadius: '20px', border: '1px solid var(--border-subtle, rgba(0,0,0,0.05))' }}>
                <Utensils size={30} style={{ opacity: 0.3, marginBottom: '10px' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>Pronto habrá recetas aquí</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '34px 20px', color: 'var(--on-surface-variant)', background: 'var(--app-surface-solid)', borderRadius: '20px', border: '1px solid var(--border-subtle, rgba(0,0,0,0.05))' }}>
                <Heart size={28} style={{ opacity: 0.3, marginBottom: '10px' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {activeCat === 'Favoritas' ? 'Aún no tienes recetas favoritas' : 'No hay recetas en este filtro'}
                </p>
              </div>
            ) : (
              <>
                {featured && <FeaturedRecipe meal={featured} onClick={() => handleMealClick(featured)} />}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: featured ? '18px' : 0 }}>
                  {listMeals.map(meal => (
                    <MealItem
                      key={meal.id}
                      meal={meal}
                      isFavorite={favoriteRecipeIds.has(meal.id)}
                      onFavorite={(e) => handleFavorite(meal.id, e)}
                      onLog={(e) => handleLogMeal(meal, e)}
                      onClick={() => handleMealClick(meal)}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
          )}
        </div>
      </motion.main>

      {/* RECIPE DRAWER */}
      <AnimatePresence>
        {showRecipe && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay" 
            onClick={() => setShowRecipe(false)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="modal-drawer"
              onClick={(e) => e.stopPropagation()}
              style={{ padding: 0, background: 'var(--surface)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <div className="sheet-handle" style={{ flexShrink: 0, margin: '12px auto 4px' }}></div>

              {/* Zona scrollable (patrón robusto iOS: contenedor flex column + interior flex:1 con scroll) */}
              <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: '8px 20px calc(env(safe-area-inset-bottom, 0px) + 40px)' }}>

              <div style={{ height: '240px', borderRadius: '28px', overflow: 'hidden', marginBottom: '24px', position: 'relative', boxShadow: '0 15px 35px rgba(0,0,0,0.1)' }}>
                <img src={recipeData?.img} alt="Recipe" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{
                  position: 'absolute', top: '20px', left: '20px',
                  background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)',
                  padding: '8px 16px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 800, color: '#1A1C1E'
                }}>
                  {recipeData?.time}
                </div>
                <button onClick={() => setShowRecipe(false)} aria-label="Cerrar" style={{ position: 'absolute', top: '16px', right: '16px', width: '38px', height: '38px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}>
                  <X size={18} color="#1A1C1E" />
                </button>
              </div>

              <div style={{ padding: '0 4px' }}>
                <h2 style={{ fontSize: '1.9rem', fontFamily: 'var(--font-display)', margin: '0 0 14px', lineHeight: 1.12, color: 'var(--on-surface)' }}>{recipeData?.title}</h2>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '26px', flexWrap: 'wrap' }}>
                   {recipeData?.time_prep && (
                     <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--fill-subtle)', padding: '8px 14px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
                       <Clock size={14} /> {recipeData.time_prep}
                     </span>
                   )}
                   {recipeData?.kcal && (
                     <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,145,77,0.1)', padding: '8px 14px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>
                       <Flame size={14} /> {recipeData.kcal} kcal
                     </span>
                   )}
                </div>

                <div style={{ background: 'var(--app-surface-solid)', borderRadius: '24px', padding: '24px', boxShadow: 'var(--card-shadow)', marginBottom: '24px', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', color: 'var(--on-surface)' }}>Ingredientes</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    {(recipeData?.ingredients || []).map((ing, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--surface-low)', borderRadius: '14px', fontSize: '0.9rem', color: 'var(--on-surface)', fontWeight: 500 }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                        {ing}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', color: 'var(--on-surface)' }}>Preparación</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {(recipeData?.steps || []).map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: '15px' }}>
                        <div style={{ 
                          width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', 
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontSize: '0.85rem', fontWeight: 900, flexShrink: 0, marginTop: '2px' 
                        }}>
                          {i+1}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--on-surface-variant)', lineHeight: 1.6, fontWeight: 500 }}>{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={handleLogFromDrawer} style={{
                  width: '100%', padding: '17px', borderRadius: '18px', marginBottom: '10px',
                  border: recipeLogged ? '1px solid rgba(46,160,67,0.28)' : 'none',
                  background: recipeLogged ? 'rgba(46,160,67,0.12)' : 'linear-gradient(135deg, var(--primary), var(--primary-dim))',
                  color: recipeLogged ? '#2EA043' : '#fff', fontSize: '1rem', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: recipeLogged ? 'none' : '0 12px 26px rgba(255,145,77,0.34)', transition: 'all 0.2s'
                }}>
                  {recipeLogged ? <><Check size={18} /> Registrada en tu día</> : <><Plus size={18} /> Me lo comí</>}
                </button>

                <button onClick={() => setShowRecipe(false)} style={{
                  width: '100%', padding: '16px', borderRadius: '18px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--fill-subtle)', color: 'var(--on-surface-variant)', fontSize: '0.95rem', fontWeight: 700,
                  boxShadow: 'none', cursor: 'pointer'
                }}>
                  Volver al menú
                </button>
              </div>
              </div>{/* /zona scrollable */}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ANUNCIO DE UPGRADE (solo planes sin plan personalizado) — al fondo */}
      {!mealPlanAccess && (
        <div style={{ padding: '0 16px', maxWidth: '600px', margin: '0 auto 18px', width: '100%' }}>
          <div style={{ padding: '22px', borderRadius: '24px', backgroundColor: '#2A1B12', color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 18px 38px rgba(58,33,24,0.28)' }}>
            <img src={ESTUDIO.portadas.nutricion} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 18%' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, rgba(40,26,18,0.94) 0%, rgba(40,26,18,0.72) 50%, rgba(58,33,24,0.38) 100%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <ChefHat size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.64rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Plan alimenticio personalizado</span>
              </div>
              <h2 style={{ fontSize: '1.4rem', color: '#fff', margin: '0 0 8px', fontFamily: 'var(--font-display)', lineHeight: 1.15 }}>Disponible en Fit y Premium</h2>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.5, margin: '0 0 16px' }}>
                Mejora tu membresía para que tu coach te diseñe un plan a la medida, mes con mes.
              </p>
              <button onClick={() => irA('/planes')} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '12px 18px', borderRadius: '14px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', boxShadow: '0 10px 24px rgba(255,145,77,0.35)' }}>
                Ver planes <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISCLAIMER NUTRICIONAL */}
      <div style={{ padding: '0 16px 140px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <div style={{
          background: 'rgba(255,139,66,0.06)', borderRadius: '20px', padding: '16px 18px',
          border: '1px solid rgba(255,139,66,0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
            <Info size={16} color="#FF8B42" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--on-surface-variant)', fontWeight: 600, lineHeight: 1.5 }}>
              La información nutricional mostrada es de referencia general y no sustituye el consejo de un profesional de la salud. Consulta a un nutriólogo para recomendaciones personalizadas.
            </p>
          </div>
          <p style={{ margin: '0 0 6px', fontSize: '0.72rem', color: 'var(--on-surface-variant)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fuentes de referencia:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { label: 'WHO — Healthy Diet (Fact Sheet)', url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet' },
              { label: 'Harvard T.H. Chan — The Nutrition Source', url: 'https://nutritionsource.hsph.harvard.edu/' },
              { label: 'USDA FoodData Central', url: 'https://fdc.nal.usda.gov/' },
            ].map(({ label, url }) => (
              <button
                key={url}
                onClick={() => window.open(url, '_system')}
                style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline', lineHeight: 1.4 }}
              >
                · {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* QR BOTTOM SHEET */}
      <AnimatePresence>
        {showQR && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="qr-sheet-overlay" onClick={() => setShowQR(false)} />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) {
                  setShowQR(false);
                }
              }}
              className="qr-bottom-sheet"
              style={{ padding: '12px 24px 20px', background: 'var(--surface)' }}
            >
              <div className="sheet-handle" />
              <button onClick={() => setShowQR(false)} aria-label="Cerrar" style={{ position: 'absolute', top: '14px', right: '16px', width: '34px', height: '34px', borderRadius: '50%', border: 'none', background: 'var(--fill-subtle)', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
                <X size={17} color="var(--on-surface)" />
              </button>
              
              <div className="wallet-card" style={{ 
                background: 'var(--surface-low)', 
                boxShadow: 'var(--card-shadow)',
                border: '1px solid var(--border-subtle)',
                position: 'relative', overflow: 'hidden',
                margin: '0 auto 10px',
                width: '100%',
                borderRadius: '30px'
              }}>
                <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)', transform: 'skewX(-20deg)' }}></div>

                <div className="wallet-header" style={{ borderBottom: 'none', paddingBottom: 0, paddingTop: '20px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', boxShadow: '0 4px 12px rgba(255,139,66,0.18)' }}><img src={ESTUDIO.marca.logo} alt={ESTUDIO.nombre} style={{ height: '24px', width: 'auto', objectFit: 'contain', display: 'block' }} /></div>
                  </div>
                  <QrCode size={20} color="var(--primary)" opacity={0.8} />
                </div>
                
                <div className="wallet-body" style={{ padding: '25px 20px', textAlign: 'center' }}>
                  <div style={{ background: 'white', padding: '12px', borderRadius: '20px', display: 'inline-block', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', border: 'none' }}>
                    <QRCodeCanvas 
                      value={user?.id || 'befit-client-id'} 
                      size={160}
                      level={"H"}
                      includeMargin={false}
                      fgColor="#000000"
                    />
                  </div>
                </div>
                
                <div className="wallet-footer" style={{ borderTop: '1px dashed var(--divider)', paddingTop: '20px', paddingBottom: '20px', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Clases Disponibles</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--black)', fontFamily: 'var(--font-display)' }}>{classesRemaining >= 9000 ? '∞' : classesRemaining} <span style={{fontSize: '0.9rem', fontWeight: 500, color: 'var(--primary)'}}>{classesRemaining >= 9000 ? 'ilimitadas' : 'sesiones'}</span></div>
                  </div>
                </div>
              </div>

              <div className="sheet-user-info" style={{ marginTop: '10px' }}>
                <div className="user-name">{user?.user_metadata?.full_name || `Miembro ${ESTUDIO.nombre}`}</div>
                <div>{user?.email}</div>
              </div>

              {walletPlatform === 'apple' && (
                <>
                  <button
                    onClick={handleAddToWallet}
                    disabled={walletLoading}
                    style={{
                      marginTop: '16px', width: '100%', padding: '14px',
                      borderRadius: '14px', border: 'none', cursor: walletLoading ? 'default' : 'pointer',
                      background: walletAdded ? '#1a1a1a' : '#000000',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      transition: 'opacity 0.2s', opacity: walletLoading ? 0.7 : 1,
                    }}
                  >
                    <Wallet size={18} color="white" />
                    <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-body)' }}>
                      {walletLoading ? 'Generando…' : walletAdded ? 'Actualizar Wallet' : 'Agregar a Apple Wallet'}
                    </span>
                  </button>
                  {walletError && (
                    <p style={{ marginTop: '8px', fontSize: '0.78rem', color: '#EF4444', textAlign: 'center' }}>
                      {walletError}
                    </p>
                  )}
                </>
              )}
              {walletPlatform === 'google' && (
                <>
                  <button
                    onClick={handleAddToWallet}
                    disabled={walletLoading}
                    style={{
                      marginTop: '16px', width: '100%', padding: '14px',
                      borderRadius: '14px', border: 'none', cursor: walletLoading ? 'default' : 'pointer',
                      background: '#1a73e8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      transition: 'opacity 0.2s', opacity: walletLoading ? 0.7 : 1,
                    }}
                  >
                    <Wallet size={18} color="white" />
                    <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-body)' }}>
                      {walletLoading ? 'Generando…' : 'Agregar a Google Wallet'}
                    </span>
                  </button>
                  {walletError && (
                    <p style={{ marginTop: '8px', fontSize: '0.78rem', color: '#EF4444', textAlign: 'center' }}>
                      {walletError}
                    </p>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* NAV */}
      <nav className={`ios-bottom-nav ${isScrolled ? 'scrolled' : ''}`}>
        <Link to="/portal" className="nav-item">
          {avatarUrl ? (
            <div style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--on-surface-variant)', flexShrink: 0 }}>
              <img src={avatarUrl} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <User size={22} strokeWidth={2.5} />
          )}
          <span>Yo</span>
        </Link>
        <Link to="/evolucion" className="nav-item"><TrendingUp size={22} strokeWidth={2.5} /><span>Metas</span></Link>
        <button className="nav-qr-button" onClick={() => setShowQR(true)}><QrCode size={24} strokeWidth={2.5} /></button>
        <Link to="/nutricion" className="nav-item active"><Utensils size={22} strokeWidth={2.5} /><span>Comida</span></Link>
        <Link to="/agenda" className="nav-item"><Calendar size={22} strokeWidth={2.5} /><span>Clases</span></Link>
      </nav>
    </div>
  );
}

function FeaturedRecipe({ meal, onClick }) {
  const { time, title, kcal, img, time_prep } = meal;
  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      style={{
        cursor: 'pointer', borderRadius: '26px', overflow: 'hidden', position: 'relative',
        minHeight: '210px', display: 'flex', alignItems: 'flex-end', padding: '20px',
        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(20,12,8,0.82) 100%), url('${img}')`,
        backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: 'var(--card-shadow)'
      }}
    >
      <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '8px' }}>
        <span style={{ background: 'var(--primary)', color: '#fff', padding: '5px 11px', borderRadius: '99px', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>★ Destacada</span>
        {time && <span style={{ background: 'rgba(255,255,255,0.92)', color: '#2D2928', padding: '5px 11px', borderRadius: '99px', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{time}</span>}
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h3 style={{ margin: '0 0 8px', color: '#fff', fontSize: '1.5rem', fontFamily: 'var(--font-display)', lineHeight: 1.1, textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>{title}</h3>
        <div style={{ display: 'flex', gap: '14px', color: 'rgba(255,255,255,0.92)', fontSize: '0.8rem', fontWeight: 700 }}>
          {kcal && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Flame size={14} /> {kcal} kcal</span>}
          {time_prep && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Clock size={14} /> {time_prep}</span>}
        </div>
      </div>
    </motion.div>
  );
}

function MealItem({ meal, isFavorite, onFavorite, onLog, onClick }) {
  const { time, title, kcal, img, time_prep } = meal;
  const [logged, setLogged] = useState(false);

  const handleLog = async (e) => {
    e.stopPropagation();
    const row = await onLog(e);
    if (row) { setLogged(true); setTimeout(() => setLogged(false), 1600); }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', cursor: 'pointer',
        background: 'var(--app-surface-solid)', borderRadius: '24px', boxShadow: 'var(--card-shadow)',
        border: '1px solid var(--border-subtle)', position: 'relative'
      }}
    >
      <div style={{ width: '90px', height: '90px', borderRadius: '20px', overflow: 'hidden', flexShrink: 0 }}>
        <img src={img} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>{time}</div>
          <button
            onClick={onFavorite}
            style={{ border: 'none', background: 'transparent', padding: '0', cursor: 'pointer', color: isFavorite ? '#FF4D4D' : 'var(--on-surface-muted)' }}
          >
            <Heart size={18} fill={isFavorite ? '#FF4D4D' : 'transparent'} />
          </button>
        </div>
        <h3 style={{ fontSize: '1.05rem', color: 'var(--black)', marginBottom: '8px', fontFamily: 'var(--font-display)', lineHeight: 1.2, fontWeight: 800 }}>{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: 'var(--on-surface-muted)', fontWeight: 700 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Flame size={14} color="var(--primary)" /> {kcal} kcal
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} /> {time_prep}
             </div>
          </div>
          <button
            onClick={handleLog}
            style={{
              flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '7px 12px', borderRadius: '99px', border: 'none', cursor: 'pointer',
              background: logged ? 'rgba(46,160,67,0.14)' : 'rgba(255,145,77,0.12)',
              color: logged ? '#2EA043' : 'var(--primary)', fontSize: '0.72rem', fontWeight: 800,
              transition: 'all 0.2s', whiteSpace: 'nowrap'
            }}
          >
            {logged ? <><Check size={13} /> Registrada</> : <><Plus size={13} /> Me lo comí</>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default Nutricion;
