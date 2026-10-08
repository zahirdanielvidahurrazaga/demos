// Fuente de verdad de categorías de clase y colores. Usado por el form del Admin,
// la vista de cliente (ScheduleCalendar), el perfil de Coach y las historias de Instagram.

// Categorías por defecto (el `name` es lo que se guarda; `label` es lo que se muestra).
export const DEFAULT_CATEGORIES = [
  { name: 'Fuerza', label: 'Fuerza', color: '#FFE4E1' },
  { name: 'Resistencia', label: 'Resistencia', color: '#E0FFFF' },
  { name: 'Relajacion', label: 'Relajación o estiramiento', color: '#F0FFF0' },
  { name: 'Gym libre', label: 'Gym libre', color: '#FFFACD' },
];

// Paleta de 10 colores pastel para elegir al crear una categoría nueva.
export const PASTEL_PALETTE = [
  '#FFE4E1', // rosa
  '#E0FFFF', // cian
  '#F0FFF0', // menta
  '#FFFACD', // amarillo
  '#FFE0F0', // rosa chicle
  '#E0E7FF', // lavanda
  '#FFEFD5', // durazno
  '#E5FFE0', // verde claro
  '#FCE4FF', // lila
  '#FFE5D4', // coral
];

const DEFAULT_MAP = Object.fromEntries(DEFAULT_CATEGORIES.map(c => [c.name, c.color]));

// Color de una clase: el guardado en la clase, o el del default por nombre, o gris.
export const resolveCatColor = (category, categoryColor) =>
  categoryColor || DEFAULT_MAP[category] || '#ECECEC';

// Etiqueta legible (mapea el name guardado a su label si es default).
export const categoryLabel = (name) =>
  DEFAULT_CATEGORIES.find(c => c.name === name)?.label || name;

// Lista única de categorías presentes en un conjunto de clases (name + color),
// combinando las default con las que existan en los datos.
export const categoriesFromClasses = (classes) => {
  const map = new Map();
  DEFAULT_CATEGORIES.forEach(c => map.set(c.name, { name: c.name, label: c.label, color: c.color }));
  (classes || []).forEach(c => {
    if (!c.category) return;
    map.set(c.category, { name: c.category, label: categoryLabel(c.category), color: resolveCatColor(c.category, c.category_color) });
  });
  return [...map.values()];
};
