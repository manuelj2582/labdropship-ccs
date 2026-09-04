// Permisos por rol. La fuente de verdad es la tabla user_roles + RLS (migración v3.20);
// esto solo decide qué se muestra en la UI.
export const ROLES = [
  { id: 'admin',    label: 'Administrador', icon: '👑', desc: 'Acceso total: crear usuarios, configurar, eliminar datos' },
  { id: 'manager',  label: 'Gerente',       icon: '📊', desc: 'Todo excepto crear usuarios y configuración del sistema' },
  { id: 'operator', label: 'Operador',      icon: '⚙️', desc: 'Producción, inventario, ventas. Sin acceso a precios ni reportes' },
  { id: 'sales',    label: 'Vendedor',      icon: '🛒', desc: 'Solo Clientes, Ventas Mayor, Productos y Leads. No ve fórmulas ni inventario' },
  { id: 'viewer',   label: 'Visor',         icon: '👁️', desc: 'Solo puede ver datos, no puede modificar nada' },
];

const ALL = ['dashboard','inventory','formulas','production','products','sales','clients','leads','suppliers','pricing','categories','users','history','activity','reports'];

export const VIEWS_BY_ROLE = {
  admin:    ALL,
  manager:  ALL.filter(v => v !== 'users'),
  operator: ['dashboard','inventory','formulas','production','products','sales','clients','leads','history'],
  sales:    ['dashboard','products','sales','clients','leads'],
  viewer:   ['dashboard','products','sales','clients','leads','history','reports'],
};

export const DEFAULT_ROLE = 'viewer';

export function canView(role, view) {
  return (VIEWS_BY_ROLE[role] || VIEWS_BY_ROLE[DEFAULT_ROLE]).includes(view);
}

export function canEdit(role) {
  return role !== 'viewer';
}
