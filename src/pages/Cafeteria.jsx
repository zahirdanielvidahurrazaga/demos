import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { Stripe } from '@capacitor-community/stripe';
import { ShoppingCart, ChevronLeft, ChevronRight, Info, Coffee, X, Receipt, Check, CreditCard, AlertCircle, Plus, Flame, Home, Gift, Star } from 'lucide-react';
import { supabase, errorDeFuncion } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import CafeProductSheet from '../components/CafeProductSheet';
import CafeCartSheet from '../components/CafeCartSheet';
import CafeOrderHistory from '../components/CafeOrderHistory';
import { CafeMenuSkeleton } from '../components/Skeleton';
import { resolveCafeImage } from '../lib/cafeImage';
import { ESTUDIO } from '../config/estudio';
import { crearIrA } from '../demo/navegacionDemo';

// Los assets locales del catálogo (PNG/WebP con fondo blanco) necesitan multiply
// para integrarse; las fotos subidas desde Admin son JPEG y van con blend normal.
const needsMultiply = (url) => /^\/cafeteria\//.test(url || '') || /\.png(\?|$)/i.test(url || '');

// Stagger de las tarjetas al entrar (se re-dispara al cambiar de pestaña).
const gridStagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const cardItem = { hidden: { opacity: 0, y: 22, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 130, damping: 18 } } };

const CafeImage = ({ src, alt }) => {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#F5F0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>
        <Coffee size={32} color="#DCD4C7" />
      </div>
    );
  }
  
  const isMango = src.includes('mango_matcha');
  return <img src={src} alt={alt} onError={() => setError(true)} loading="eager" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: needsMultiply(src) ? 'multiply' : 'normal', transform: isMango ? 'scale(1.4)' : 'scale(1.15)' }} />;
};

function Cafeteria() {
  const navigate = useNavigate();
  const { user, cafeProducts, cafeProductsLoaded, esDemo} = useAuth();
  // Dentro de la maqueta, navegar a una ruta real sacaría a la prospecta.
  const irA = crearIrA(navigate, esDemo);
  const isNative = Capacitor.isNativePlatform();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const [activeWidgetIndex, setActiveWidgetIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showThanks, setShowThanks] = useState(false);

  // --- Pedido (estilo Uber Eats) ---
  const [optionGroups, setOptionGroups] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null); // ficha/personalización
  const [showCart, setShowCart] = useState(false);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('befit_cafe_cart')) || []; } catch { return []; }
  });
  const [confirming, setConfirming] = useState(null);   // { meta } durante la cuenta de 5s
  const [countdown, setCountdown] = useState(5);
  const [processing, setProcessing] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);          // pedidos en curso del usuario
  const [activeTab, setActiveTab] = useState('home');            // home, order, rewards, history
  const [isScrolled, setIsScrolled] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);   // pide registrarse/login para comprar
  const [returnedFromPay, setReturnedFromPay] = useState(false); // volvió del checkout web (Stripe)
  const [loyalty, setLoyalty] = useState({ stamps: 0, gifts_available: 0 }); // Starbucks style rewards
  // Portadas de "Novedades", editables desde Admin → Cafetería (tabla cafe_covers).
  // Antes estaban hardcodeadas aquí, lo que obligaba a recompilar la app para
  // cambiar una imagen. Ahora la dueña las cambia sola y se ven al instante.
  const [covers, setCovers] = useState([]);
  const [coverIndex, setCoverIndex] = useState(0);



  // Cargar estado de lealtad
  useEffect(() => {
    if (!user?.id) return;
    const fetchLoyalty = async () => {
      const { data } = await supabase.from('cafe_loyalty').select('*').eq('user_id', user.id).single();
      if (data) setLoyalty(data);
      else setLoyalty({ stamps: 0, gifts_available: 0 });
    };
    fetchLoyalty();
    const ch = supabase.channel(`loyalty-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_loyalty', filter: `user_id=eq.${user.id}` }, fetchLoyalty)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user?.id]);

  // Precarga las imágenes del catálogo en cuanto llegan los productos, así ya
  // están en caché al abrir la pestaña Menú y aparecen al instante.
  useEffect(() => {
    (cafeProducts || []).forEach(p => {
      const url = resolveCafeImage(p);
      if (url) { const img = new Image(); img.src = url; }
    });
  }, [cafeProducts]);

  // Catálogo desde la BD (precios server-side). Solo productos disponibles.
  const available = (cafeProducts || []).filter(p => p.available !== false).map(p => {
    const url = resolveCafeImage(p);
    return url ? { ...p, image_url: url } : p;
  });
  const coffeeItems = available.filter(p => p.category === 'coffee');
  const smoothieItems = available.filter(p => p.category === 'smoothie');
  const temporadaItems = available.filter(p => p.category === 'temporada');

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.lineTotal, 0);

  // Pestañas por categoría (Especiales/Temporada primero)
  const TABS = [
    { key: 'temporada', label: 'Especiales', items: temporadaItems },
    { key: 'coffee', label: 'Ice Coffee', items: coffeeItems },
    { key: 'smoothie', label: ESTUDIO.nombreCafeteria, items: smoothieItems },
  ];
  const visibleTabs = TABS.filter(t => t.items.length > 0);
  const [activeCat, setActiveCat] = useState('temporada');
  // Si la categoría activa no tiene productos (al cargar), saltar a la primera disponible
  useEffect(() => {
    const keys = visibleTabs.map(t => t.key);
    if (keys.length && !keys.includes(activeCat)) setActiveCat(keys[0]);
  }, [cafeProducts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Portadas: carga + realtime (Admin las cambia y la app abierta se entera).
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('cafe_covers')
        .select('*').eq('active', true)
        .order('sort_order', { ascending: true });
      setCovers(data || []);
      setCoverIndex(0);
    };
    load();
    const ch = supabase.channel('public:cafe_covers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_covers' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Rotación automática cuando hay más de una portada.
  useEffect(() => {
    if (covers.length < 2) return;
    const t = setInterval(() => setCoverIndex(i => (i + 1) % covers.length), 5000);
    return () => clearInterval(t);
  }, [covers.length]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    if (new URLSearchParams(window.location.search).get('payment') === 'success') {
      setCart([]);
      window.history.replaceState?.({}, '', '/cafeteria'); // limpiar el ?payment para no repetir
      setReturnedFromPay(true); // abrir el seguimiento cuando cargue la sesión
    }
    const onPaid = () => setShowThanks(true);
    window.addEventListener('cafe-payment-success', onPaid);
    // Cargar grupos de personalización (con sus opciones)
    (async () => {
      const { data } = await supabase.from('cafe_option_groups').select('*, cafe_options(*)').order('sort_order');
      setOptionGroups(data || []);
    })();
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('cafe-payment-success', onPaid);
    };
  }, []);

  // Pedidos en curso del usuario (para el botón "Mi pedido") + realtime
  useEffect(() => {
    if (!user?.id) return;
    const fetchActive = async () => {
      const { data } = await supabase.from('cafe_orders').select('id,status,created_at').eq('user_id', user.id).in('status', ['paid', 'preparing', 'ready']).order('created_at', { ascending: false });
      setActiveOrders(data || []);
    };
    fetchActive();
    const ch = supabase.channel(`my-cafe-orders-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_orders', filter: `user_id=eq.${user.id}` }, fetchActive)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user?.id]);

  const orderStatusLabel = (s) => s === 'preparing' ? 'Preparándose' : s === 'ready' ? '¡Listo para recoger!' : 'Confirmado';

  // Persistir el carrito (sobrevive a navegar a registro/login y a recargas)
  useEffect(() => {
    try { localStorage.setItem('befit_cafe_cart', JSON.stringify(cart)); } catch { /* almacenamiento lleno */ }
  }, [cart]);

  // Reconciliar el carrito con el catálogo: si un producto se eliminó/ocultó,
  // quitarlo del carrito guardado (evita que falle el checkout con datos viejos).
  useEffect(() => {
    if (!cafeProducts || cafeProducts.length === 0) return;
    const okIds = new Set(cafeProducts.filter(p => p.available !== false).map(p => p.id));
    setCart(prev => {
      const next = prev.filter(i => okIds.has(i.product_id));
      return next.length === prev.length ? prev : next;
    });
  }, [cafeProducts]);

  // Al volver autenticado tras registrarse/iniciar sesión, reabrir el carrito para finalizar
  useEffect(() => {
    if (user?.id && localStorage.getItem('befit_cafe_resume') === '1') {
      localStorage.removeItem('befit_cafe_resume');
      if (cart.length > 0) setShowCart(true);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al volver del pago web (Stripe), llevar a "Pedidos", igual que el pago en
  // efectivo y el nativo: ahí está el pedido y su seguimiento (CafeOrderHistory).
  // Antes abría un seguimiento que desde el 7-jun ya no se pinta aquí, y el
  // bloqueo de scroll se quedaba puesto con la pantalla vacía.
  // Espera a que la sesión cargue; corre de nuevo cuando user.id esté disponible.
  useEffect(() => {
    if (!returnedFromPay || !user?.id) return;
    setReturnedFromPay(false);
    setActiveTab('history');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [returnedFromPay, user?.id]);

  // Fallback: si tras unos segundos no hay sesión, al menos mostrar el "¡Gracias!"
  useEffect(() => {
    if (!returnedFromPay) return;
    const t = setTimeout(() => { if (!user?.id) { setReturnedFromPay(false); setShowThanks(true); } }, 4500);
    return () => clearTimeout(t);
  }, [returnedFromPay, user?.id]);

  // Bloquear el scroll del fondo cuando hay una hoja/overlay abierto
  useEffect(() => {
    const open = selectedProduct || showCart || confirming || processing || showThanks || showAuthPrompt;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedProduct, showCart, confirming, processing, showThanks, showAuthPrompt]);

  const nextWidget = () => setActiveWidgetIndex((prev) => (prev + 1) % 3);
  const prevWidget = () => setActiveWidgetIndex((prev) => (prev - 1 + 3) % 3);

  // Carrito
  const openProduct = (item) => setSelectedProduct(item);
  const addToCart = (line) => { setCart(c => [...c, line]); setSelectedProduct(null); };
  const updateQty = (lineId, delta) => setCart(c => c.map(i => i.lineId === lineId ? { ...i, qty: Math.max(1, i.qty + delta), lineTotal: i.unitPrice * Math.max(1, i.qty + delta) } : i));
  const removeItem = (lineId) => setCart(c => c.filter(i => i.lineId !== lineId));

  // Cuenta regresiva de 5s para cancelar antes de pagar
  const startCheckout = (meta) => {
    // Para comprar hay que tener cuenta (no requiere membresía). Sin sesión → registrarse.
    if (!user?.id) { setShowCart(false); setShowAuthPrompt(true); return; }
    setShowCart(false); setConfirming(meta); setCountdown(5);
  };
  const cancelCheckout = () => setConfirming(null);
  useEffect(() => {
    if (!confirming) return;
    if (countdown <= 0) { proceedToPayment(confirming); setConfirming(null); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [confirming, countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  const proceedToPayment = async (meta) => {
    if (processing || cart.length === 0) return;
    setProcessing(true);
    try {
      const items = cart.map(i => ({ product_id: i.product_id, quantity: i.qty, option_ids: i.option_ids, notes: i.notes }));
      const body = { items, userEmail: user?.email, userId: user?.id, gift: meta.gift, pickupTime: meta.pickupTime, noStraw: meta.noStraw, returnUrl: window.location.origin };

      if (meta.paymentMethod === 'cash') {
        const { data, error } = await supabase.functions.invoke('cash-cafe-checkout', { body });
        if (error || data?.error) throw new Error(await errorDeFuncion(error, data, 'No se pudo registrar el pedido. Intenta de nuevo.'));
        
        const resumen = cart.map(i => `${i.qty}× ${i.name}`).join(', ');
        if (user?.id) supabase.functions.invoke('send-push', { body: { userId: user.id, title: 'Pedido confirmado', body: `${resumen}. ¡Paga en caja al recoger!`, type: 'payment', skipLog: true } });
        if (meta.gift?.recipient_user_id) supabase.functions.invoke('send-push', { body: { userId: meta.gift.recipient_user_id, title: '¡Te enviaron un regalo!', body: meta.gift.message || `Te regalaron: ${resumen}`, type: 'payment', skipLog: true } });
        
        setCart([]);
        setActiveTab('history');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setProcessing(false);
        return;
      }

      if (Capacitor.isNativePlatform()) {
        const { data, error } = await supabase.functions.invoke('stripe-cafe-intent', { body });
        if (error) throw new Error(await errorDeFuncion(error, data, 'No se pudo iniciar el pago. Intenta de nuevo.'));
        if (!data?.clientSecret) throw new Error('No se recibió el intent de pago');
        const isIOS = Capacitor.getPlatform() === 'ios';
        const isAndroid = Capacitor.getPlatform() === 'android';
        try {
          await Stripe.createPaymentSheet({ 
            paymentIntentClientSecret: data.clientSecret, 
            merchantDisplayName: ESTUDIO.nombre, 
            enableApplePay: isIOS, 
            applePayMerchantId: isIOS ? ESTUDIO.tiendas.applePayMerchantId : undefined, 
            enableGooglePay: isAndroid,
            GooglePayIsTesting: false,
            countryCode: 'MX' 
          });
        } catch (e) {
          console.error('Error con Apple/Google Pay:', e);
          await Stripe.createPaymentSheet({ paymentIntentClientSecret: data.clientSecret, merchantDisplayName: ESTUDIO.nombre });
        }
        const res = await Stripe.presentPaymentSheet();
        if (res?.paymentResult === 'paymentSheetCompleted') {
          // Pedido pagado: notificación verificada (servidor) + push (cliente, camino probado)
          supabase.functions.invoke('stripe-cafe-notify', { body: { paymentIntentId: data.paymentIntentId } });
          const resumen = cart.map(i => `${i.qty}× ${i.name}`).join(', ');
          if (user?.id) supabase.functions.invoke('send-push', { body: { userId: user.id, title: 'Pedido confirmado', body: `${resumen}. ¡Ya lo estamos preparando!`, type: 'payment', skipLog: true } });
          if (meta.gift?.recipient_user_id) supabase.functions.invoke('send-push', { body: { userId: meta.gift.recipient_user_id, title: '¡Te enviaron un regalo!', body: meta.gift.message || `Te regalaron: ${resumen}`, type: 'payment', skipLog: true } });
          setCart([]);
          setActiveTab('history');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        // Web: checkout hospedado con personalización completa (mismo carrito que el nativo).
        // Redirigir en la MISMA pestaña: window.open desde un timer lo bloquea el navegador
        // como popup (por eso "no salía el pago"). El success_url regresa a /cafeteria.
        const { data, error } = await supabase.functions.invoke('stripe-cafe-checkout', { body });
        if (error || data?.error) throw new Error(await errorDeFuncion(error, data, 'No se pudo iniciar el pago. Intenta de nuevo.'));
        if (data?.url) {
          // Marca para que al volver de Stripe NO se haga auto-signout (el sessionStorage
          // del tab puede perderse en el viaje cross-dominio). Sobrevive en localStorage.
          localStorage.setItem('befit_payment_return', String(Date.now()));
          window.location.href = data.url;
          return;
        }
      }
    } catch (err) {
      console.error('Error en el pago:', err);
      alert('Error procesando pago: ' + (err.message || 'Error desconocido'));
    } finally {
      setProcessing(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', color: '#2B211C', fontFamily: 'var(--font-body)', overflowX: 'hidden', paddingBottom: '90px' }}>
      
      {/* HEADER (solo en order y history) - ELIMINADO para mantener consistencia de Pestañas grandes sin botón de volver */}


      <AnimatePresence mode="wait">
        
        {/* --- PESTAÑA: HOME --- */}
        {activeTab === 'home' && (
          <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} style={{ padding: isNative ? 'calc(env(safe-area-inset-top, 44px) + 20px) 24px 40px' : '40px 24px' }}>
            
            {/* Header del Home (Rediseñado - Saludo Arriba a la Derecha) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
              <div style={{ paddingTop: '6px' }}>
                <button onClick={() => irA(user ? '/portal' : '/')} style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#fff', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.04)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
                  <ChevronLeft size={22} color="#2B211C" />
                </button>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.3rem', fontWeight: 800, color: '#2B211C', margin: '0 0 4px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {getGreeting()},<br/>
                  <span style={{ color: '#FF914D' }}>{user?.user_metadata?.full_name ? user.user_metadata.full_name.split(' ')[0] : 'Cliente'}</span>.
                </h1>
                <p style={{ color: '#7D7068', fontSize: '1.05rem', margin: 0, fontWeight: 500 }}>¿Qué se te antoja hoy?</p>
              </div>
            </div>

            {/* Atajo Rewards */}
            {user && (
              <motion.div whileTap={{ scale: 0.98 }} onClick={() => setActiveTab('rewards')} style={{ background: '#fff', borderRadius: '24px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 12px 30px rgba(0,0,0,0.03)', marginBottom: '40px', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.02)' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #FAF8F5, #F5F0E6)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }} style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,145,77,0.2) 0%, transparent 70%)' }} />
                  <svg width="46" height="46" viewBox="0 0 36 36" style={{ position: 'absolute' }}>
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,145,77,0.15)" strokeWidth="3" />
                    <motion.path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#FF914D" strokeWidth="3" strokeDasharray="100, 100" initial={{ strokeDashoffset: 100 }} animate={{ strokeDashoffset: 100 - Math.min(100, ((loyalty?.stamps || 0) / 12) * 100) }} transition={{ duration: 1.5, ease: "easeOut" }} />
                  </svg>
                  <Coffee size={20} color="#FF914D" style={{ position: 'relative', zIndex: 1 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#2B211C', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{ESTUDIO.nombreCafeteria} Rewards</div>
                  <div style={{ color: '#7D7068', fontSize: '0.95rem' }}>{Math.min(100, Math.round(((loyalty?.stamps || 0) / 12) * 100))} de 100 puntos para tu regalo.</div>
                </div>
                <ChevronRight size={20} color="#CCC0B6" />
              </motion.div>
            )}

            {/* Carrusel Featured */}
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: '#2B211C', margin: '0 0 16px' }}>Novedades</h2>
              {(() => {
                // Portada activa. Si Admin todavía no subió ninguna, se cae a la
                // que venía empaquetada, para que la sección nunca quede vacía.
                const cover = covers[coverIndex] || { image_url: ESTUDIO.portadas.cafeteriaPromo, eyebrow: 'Temporada', title: 'Recién hecho\npara ti', cta: 'Pedir Ahora' };
                return (
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '4/5', borderRadius: '28px', overflow: 'hidden', background: '#DCD4C7', cursor: 'pointer' }} onClick={() => setActiveTab('order')}>
                    <AnimatePresence mode="wait">
                      <motion.img key={cover.image_url} src={cover.image_url} alt={cover.title || 'Novedades'} decoding="async" fetchPriority="high"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    </AnimatePresence>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
                    <div style={{ position: 'absolute', bottom: '24px', left: '24px', right: '24px' }}>
                      {cover.eyebrow && <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{cover.eyebrow}</div>}
                      {cover.title && <div style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1.1, marginBottom: '16px', whiteSpace: 'pre-line' }}>{cover.title}</div>}
                      <button style={{
                        width: '100%', padding: '16px', borderRadius: '100px',
                        background: 'rgba(255, 255, 255, 0.25)',
                        backdropFilter: 'blur(16px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        color: '#fff',
                        fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>{cover.cta || 'Pedir Ahora'}</button>
                    </div>

                    {/* Puntos: solo si la dueña subió más de una portada */}
                    {covers.length > 1 && (
                      <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '6px' }}>
                        {covers.map((c, i) => (
                          <div key={c.id} onClick={(e) => { e.stopPropagation(); setCoverIndex(i); }}
                            style={{ width: i === coverIndex ? '20px' : '7px', height: '7px', borderRadius: '10px', background: i === coverIndex ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'width 0.3s', cursor: 'pointer' }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}

        {/* --- PESTAÑA: MENU --- */}
        {activeTab === 'order' && (
          <motion.div key="order" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} style={{ padding: isNative ? 'calc(env(safe-area-inset-top, 44px) + 20px) 24px 40px' : '40px 24px' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 800, color: '#2B211C', margin: '0' }}>Menú</h2>
            </div>

            {!cafeProductsLoaded && (cafeProducts || []).length === 0 && <CafeMenuSkeleton />}
            
            {/* Filtros - Estilo Segmented Control iOS */}
            <div style={{ margin: '0 0 24px', background: 'rgba(219, 210, 198, 0.4)', padding: '4px', borderRadius: '100px', display: 'flex', position: 'relative' }}>
              {[
                { id: 'temporada', label: 'Especiales' },
                { id: 'coffee', label: 'Ice Coffee' },
                { id: 'smoothie', label: ESTUDIO.nombreCafeteria }
              ].map(cat => {
                const active = activeCat === cat.id;
                return (
                  <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '100px',
                      border: 'none',
                      fontWeight: active ? 800 : 600,
                      fontSize: '0.9rem',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                      background: active ? '#FFFFFF' : 'transparent',
                      color: active ? '#2B211C' : '#7D7068',
                      boxShadow: active ? '0 4px 12px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.1)' : 'none'
                    }}>
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* CONTENIDO DE LA PESTAÑA ACTIVA */}
            <AnimatePresence mode="wait">
            <motion.div key={activeCat} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24 }}>
            {activeCat === 'coffee' && coffeeItems.length > 0 && (
            <motion.div variants={gridStagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {coffeeItems.map(item => (
                  <motion.div variants={cardItem} key={item.id} onClick={() => openProduct(item)}
                    style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '16px' }}>
                    <div style={{ width: '90px', height: '90px', borderRadius: '16px', background: '#F5F0E6', flexShrink: 0, overflow: 'hidden', padding: '10px' }}>
                      <CafeImage src={item.image_url} alt={item.name} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: '#2B211C', lineHeight: 1.2 }}>{item.name}</h3>
                      <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#7D7068', opacity: 0.9, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>
                      <span style={{ fontWeight: 800, color: '#2B211C', fontSize: '1rem' }}>${item.price}</span>
                    </div>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(43, 33, 28, 0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 12px rgba(43,33,28,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 'auto' }}>
                      <Plus size={20} color="#fff" strokeWidth={3} />
                    </div>
                  </motion.div>
                ))}
            </motion.div>
            )}

            {activeCat === 'smoothie' && smoothieItems.length > 0 && (
            <motion.div variants={gridStagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {smoothieItems.map(item => (
                  <motion.div variants={cardItem} key={item.id} onClick={() => openProduct(item)}
                    style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '16px' }}>
                    <div style={{ width: '90px', height: '90px', borderRadius: '16px', background: '#F5F0E6', flexShrink: 0, overflow: 'hidden', padding: '10px' }}>
                      <CafeImage src={item.image_url} alt={item.name} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: '#2B211C', lineHeight: 1.2 }}>{item.name}</h3>
                      <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#7D7068', opacity: 0.9, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>
                      <span style={{ fontWeight: 800, color: '#2B211C', fontSize: '1rem' }}>${item.price}</span>
                    </div>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(43, 33, 28, 0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 12px rgba(43,33,28,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 'auto' }}>
                      <Plus size={20} color="#fff" strokeWidth={3} />
                    </div>
                  </motion.div>
                ))}
            </motion.div>
            )}

            {activeCat === 'temporada' && temporadaItems.length > 0 && (
            <motion.div variants={gridStagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {temporadaItems.map(item => (
                  <motion.div variants={cardItem} key={item.id} onClick={() => openProduct(item)}
                    style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '16px', position: 'relative' }}>
                    <div style={{ width: '90px', height: '90px', borderRadius: '16px', background: '#F5F0E6', flexShrink: 0, overflow: 'hidden', padding: '10px' }}>
                      <CafeImage src={item.image_url} alt={item.name} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ background: '#FF914D', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', width: 'fit-content', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Especial</div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: '#2B211C', lineHeight: 1.2 }}>{item.name}</h3>
                      <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#7D7068', opacity: 0.9, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>
                      <span style={{ fontWeight: 800, color: '#2B211C', fontSize: '1rem' }}>${item.price}</span>
                    </div>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(43, 33, 28, 0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 12px rgba(43,33,28,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 'auto' }}>
                      <Plus size={20} color="#fff" strokeWidth={3} />
                    </div>
                  </motion.div>
                ))}
            </motion.div>
            )}
            </motion.div>
            </AnimatePresence>
            <div style={{ height: '40px' }} />
          </motion.div>
        )}

        {/* --- PESTAÑA: REWARDS --- */}
        {activeTab === 'rewards' && (
          <motion.div key="rewards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} style={{ padding: '40px 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 800, color: '#2B211C', margin: '0 0 8px' }}>Mis Puntos</h2>
              <p style={{ color: '#7D7068', fontSize: '1.05rem', margin: 0 }}>Acumula puntos con cada compra para ganar premios.</p>
            </div>
            
            {user ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ maxWidth: '600px', margin: '0 auto' }}>
                {/* Dashboard Principal de Puntos - Light Premium */}
                <div style={{ background: '#fff', borderRadius: '32px', padding: '40px 30px', boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
                  
                  {/* Círculo Gigante de Puntos Animado */}
                  <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Aura de luz pulsante */}
                    <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }} style={{ position: 'absolute', top: '50%', left: '50%', width: '160px', height: '160px', background: 'radial-gradient(circle, rgba(255,145,77,0.15) 0%, transparent 70%)', borderRadius: '50%', marginLeft: '-80px', marginTop: '-80px' }} />
                    <svg width="200" height="200" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                      {/* Fondo */}
                      <circle cx="100" cy="100" r="90" fill="none" stroke="#F5F0E6" strokeWidth="12" />
                      {/* Progreso Animado */}
                      <motion.circle cx="100" cy="100" r="90" fill="none" stroke="url(#orange-grad)" strokeWidth="12" strokeLinecap="round" strokeDasharray="565.48" initial={{ strokeDashoffset: 565.48 }} animate={{ strokeDashoffset: 565.48 - (565.48 * (Math.min(100, ((loyalty?.stamps || 0) / 12) * 100) / 100)) }} transition={{ duration: 1.5, ease: "easeOut" }} />
                      <defs>
                        <linearGradient id="orange-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FFD194" />
                          <stop offset="100%" stopColor="#FF914D" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }} style={{ position: 'relative', zIndex: 1, marginBottom: '4px' }}>
                      <Star size={40} color="#FF914D" fill="#FF914D" />
                    </motion.div>
                    <div style={{ fontSize: '3.2rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#2B211C', lineHeight: 1, position: 'relative', zIndex: 1 }}>{Math.min(100, Math.round(((loyalty?.stamps || 0) / 12) * 100))}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#7D7068', textTransform: 'uppercase', letterSpacing: '0.1em', position: 'relative', zIndex: 1 }}>Puntos</div>
                  </div>

                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2B211C', margin: '0 0 8px' }}>¡Te faltan {100 - Math.min(100, Math.round(((loyalty?.stamps || 0) / 12) * 100))} puntos!</h3>
                  <p style={{ color: '#7D7068', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>Llega a 100 puntos (12 compras) para desbloquear un regalo sorpresa.</p>
                </div>

                <AnimatePresence>
                  {(loyalty?.gifts_available || 0) > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 30 }} style={{ background: 'linear-gradient(135deg, #FF914D, #E07A9C)', borderRadius: '24px', padding: '24px', boxShadow: '0 15px 30px rgba(255,145,77,0.2)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Gift size={28} color="#FF914D" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.3rem', marginBottom: '4px' }}>Tienes {loyalty?.gifts_available || 0} Regalo{(loyalty?.gifts_available || 0) > 1 ? 's' : ''} Sorpresa</div>
                        <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)' }}>Muéstrale esta pantalla a tu barista para canjear tu premio.</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 30px', maxWidth: '600px', margin: '0 auto', background: 'linear-gradient(135deg, #1A1C1E 0%, #0F1011 100%)', borderRadius: '32px', boxShadow: '0 30px 60px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '150%', height: '150%', background: 'radial-gradient(circle at top left, rgba(255,145,77,0.15) 0%, transparent 60%)', pointerEvents: 'none' }}></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF914D, #E07A9C)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 15px 30px rgba(255,145,77,0.3)' }}>
                    <Coffee size={32} color="#fff" strokeWidth={2.5} />
                  </div>
                  <h1 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', color: '#fff', marginBottom: '12px', letterSpacing: '-0.02em' }}>Coffee Lab Rewards</h1>
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0 auto 30px', fontSize: '0.95rem', maxWidth: '300px', lineHeight: 1.5 }}>Únete y recibe un regalo sorpresa cada 12 compras.</p>
                  <button onClick={() => { localStorage.setItem('befit_redirect_after_auth', '/cafeteria'); irA('/registro'); }} style={{ padding: '16px 36px', borderRadius: '100px', background: '#FF914D', color: '#fff', fontWeight: 800, fontSize: '1rem', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(255,145,77,0.4)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
                    Crear cuenta
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* --- PESTAÑA: HISTORY --- */}
        {activeTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            <CafeOrderHistory
              userId={user?.id}
              onClose={() => setActiveTab('home')}
              onOpenOrder={() => {}} 
            />
          </motion.div>
        )}

        {/* --- PESTAÑA: CART --- */}
        {activeTab === 'cart' && (
          <motion.div key="cart" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} style={{ padding: isNative ? 'calc(env(safe-area-inset-top, 44px) + 20px) 24px 40px' : '40px 24px' }}>
            <CafeCartSheet cart={cart} products={available} onUpdateQty={updateQty} onRemove={removeItem} onOpenProduct={(p) => { setActiveTab('order'); setSelectedProduct(p); }} onCheckout={startCheckout} />
          </motion.div>
        )}

      </AnimatePresence>

      {/* NAVEGACIÓN INFERIOR (Estilo App Nativa) */}
      <nav className={`ios-bottom-nav ${isScrolled ? 'scrolled' : ''}`}>
        <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => { setActiveTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <Home />
          <span>Inicio</span>
        </div>
        <div className={`nav-item ${activeTab === 'order' ? 'active' : ''}`} onClick={() => { setActiveTab('order'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <Coffee />
          <span>Menú</span>
        </div>
        
        {/* Carrito en la barra de navegación */}
        <div className={`nav-item ${activeTab === 'cart' ? 'active' : ''}`} onClick={() => { setActiveTab('cart'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ position: 'relative' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart color={cartCount > 0 ? '#FF914D' : 'currentColor'} />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} style={{ position: 'absolute', top: '-6px', right: '-12px', background: '#FF914D', color: '#fff', fontSize: '0.65rem', fontWeight: 900, width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                  {cartCount}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span style={{ color: cartCount > 0 ? '#FF914D' : 'inherit', fontWeight: cartCount > 0 ? 700 : 500 }}>Carrito</span>
        </div>

        <div className={`nav-item ${activeTab === 'rewards' ? 'active' : ''}`} onClick={() => { setActiveTab('rewards'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <Gift />
          <span>Rewards</span>
        </div>
        <div className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => { setActiveTab('history'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <Receipt />
          <span>Pedidos</span>
        </div>
      </nav>


      {/* FICHA / PERSONALIZACIÓN */}
      <AnimatePresence>
        {selectedProduct && (
          <CafeProductSheet product={selectedProduct} groups={optionGroups} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />
        )}
      </AnimatePresence>

      {/* CUENTA REGRESIVA DE CANCELACIÓN (5s) */}
      <AnimatePresence>
        {confirming && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 4500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px', marginBottom: '24px' }}>
              <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                <motion.circle cx="60" cy="60" r="52" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: 2 * Math.PI * 52 }} transition={{ duration: 5, ease: 'linear' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.6rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-display)' }}>{countdown}</div>
            </div>
            <h2 style={{ color: '#fff', margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>Confirmando tu pedido…</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 28px', fontSize: '0.95rem' }}>¿Te arrepentiste? Aún puedes cancelar.</p>
            <button onClick={cancelCheckout} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)', padding: '14px 40px', borderRadius: '16px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SE REQUIERE ELIMINAR ESTO PORQUE AHORA ESTA EN EL TAB */}


      {/* PROMPT: crear cuenta para comprar (sin requerir membresía) */}
      <AnimatePresence>
        {showAuthPrompt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAuthPrompt(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 4600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.85, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 20, stiffness: 240 }}
              style={{ width: 'min(360px, 100%)', background: '#fff', borderRadius: '28px', padding: '34px 26px', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', position: 'relative' }}>
              <button onClick={() => setShowAuthPrompt(false)} aria-label="Cerrar" style={{ position: 'absolute', top: '16px', right: '16px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={16} color="#1A1C1E" />
              </button>
              <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF914D, #E07A9C)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 10px 25px rgba(255,145,77,0.4)' }}>
                <Coffee size={38} color="#fff" strokeWidth={2.2} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.55rem', margin: '0 0 8px', color: '#1A1C1E' }}>Crea tu cuenta para pedir</h2>
              <p style={{ margin: '0 0 24px', fontSize: '0.95rem', color: '#6B7280', lineHeight: 1.5 }}>Es gratis y rápido — no necesitas membresía. Así puedes seguir tu pedido en vivo y recibir avisos cuando esté listo.</p>
              <button onClick={() => { localStorage.setItem('befit_redirect_after_auth', '/cafeteria'); localStorage.setItem('befit_cafe_resume', '1'); irA('/registro'); }} style={{ width: '100%', padding: '15px', borderRadius: '16px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 10px 25px rgba(255,145,77,0.35)', marginBottom: '10px' }}>
                Registrarme
              </button>
              <button onClick={() => { localStorage.setItem('befit_redirect_after_auth', '/cafeteria'); localStorage.setItem('befit_cafe_resume', '1'); irA('/login'); }} style={{ width: '100%', padding: '13px', borderRadius: '16px', border: '1.5px solid rgba(0,0,0,0.12)', background: '#fff', color: '#1A1C1E', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
                Ya tengo cuenta
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SE REQUIERE ELIMINAR ESTO PORQUE AHORA ESTA EN EL TAB */}

      {/* SE REQUIERE ELIMINAR ESTO PORQUE AHORA ESTA EN EL TAB */}

      {/* OVERLAY DE CARGA ANTES DEL PAGO */}
      <AnimatePresence>
        {processing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 4700, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
              style={{ width: '54px', height: '54px', borderRadius: '50%', border: '4px solid rgba(255,255,255,0.25)', borderTopColor: '#fff' }} />
            <p style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', margin: 0 }}>Preparando tu pago…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL "¡GRACIAS!" tras el pago */}
      {showThanks && (
        <div onClick={() => setShowThanks(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 18, stiffness: 220 }}
            style={{ width: 'min(360px, 100%)', background: '#fff', borderRadius: '28px', padding: '34px 26px', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', position: 'relative' }}>
            <button onClick={() => setShowThanks(false)} aria-label="Cerrar" style={{ position: 'absolute', top: '16px', right: '16px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={16} color="#1A1C1E" />
            </button>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
              style={{ width: '76px', height: '76px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF914D, #E07A9C)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 10px 25px rgba(255,145,77,0.4)' }}>
              <CheckCircle2 size={42} color="#fff" strokeWidth={2.5} />
            </motion.div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', margin: '0 0 8px', color: '#1A1C1E' }}>¡Gracias!</h2>
            <p style={{ margin: '0 0 24px', fontSize: '0.95rem', color: '#6B7280', lineHeight: 1.5 }}>Tu pedido fue procesado. Pásalo a recoger a la cafetería.</p>
            <button onClick={() => setShowThanks(false)} style={{ width: '100%', padding: '15px', borderRadius: '16px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 10px 25px rgba(255,145,77,0.35)' }}>
              ¡Listo!
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default Cafeteria;
