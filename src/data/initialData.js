export const CATEGORIES = [
  { id: 'serum', name: 'Serums & Skincare', icon: '💧', color: '#A78BFA' },
  { id: 'auto', name: 'Automotriz', icon: '🚗', color: '#60A5FA' },
  { id: 'mascotas', name: 'Mascotas', icon: '🐾', color: '#34D399' },
  { id: 'hogar', name: 'Limpieza & Hogar', icon: '🏠', color: '#FBBF24' },
];

export const UNITS = ['ml', 'g', 'kg', 'L', 'oz', 'unidad'];

export const INITIAL_DATA = {
  rawMaterials: [
    { id: 'rm1', name: 'Ácido Hialurónico', unit: 'ml', stock: 25000, minStock: 5000, cost: 0.85, supplierId: 'sup1' },
    { id: 'rm2', name: 'Vitamina C (Ác. Ascórbico)', unit: 'g', stock: 15000, minStock: 3000, cost: 0.12, supplierId: 'sup2' },
    { id: 'rm3', name: 'Glicerina Vegetal', unit: 'L', stock: 200, minStock: 40, cost: 4.50, supplierId: 'sup1' },
    { id: 'rm4', name: 'Cera de Carnauba', unit: 'g', stock: 40000, minStock: 8000, cost: 0.08, supplierId: 'sup3' },
    { id: 'rm5', name: 'Aceite de Neem', unit: 'ml', stock: 10000, minStock: 2500, cost: 0.35, supplierId: 'sup2' },
    { id: 'rm6', name: 'Bicarbonato de Sodio', unit: 'kg', stock: 120, minStock: 25, cost: 2.00, supplierId: 'sup1' },
    { id: 'rm7', name: 'Fragancia Lavanda', unit: 'ml', stock: 15000, minStock: 3000, cost: 0.22, supplierId: 'sup4' },
    { id: 'rm8', name: 'Niacinamida', unit: 'g', stock: 8000, minStock: 2000, cost: 0.45, supplierId: 'sup2' },
    { id: 'rm9', name: 'Alcohol Isopropílico', unit: 'L', stock: 80, minStock: 20, cost: 3.20, supplierId: 'sup1' },
    { id: 'rm10', name: 'Aceite de Coco Fraccionado', unit: 'L', stock: 60, minStock: 15, cost: 6.80, supplierId: 'sup2' },
  ],

  formulas: [
    {
      id: 'f1', name: 'Serum Vitamina C 20%', category: 'serum',
      yieldAmount: 30, yieldUnit: 'ml',
      ingredients: [
        { materialId: 'rm2', amount: 6 },
        { materialId: 'rm3', amount: 0.02 },
        { materialId: 'rm1', amount: 5 },
      ],
      salePrice: 2.80, // precio al mayor por unidad
    },
    {
      id: 'f2', name: 'Serum Niacinamida 10%', category: 'serum',
      yieldAmount: 30, yieldUnit: 'ml',
      ingredients: [
        { materialId: 'rm8', amount: 3 },
        { materialId: 'rm3', amount: 0.02 },
        { materialId: 'rm1', amount: 4 },
      ],
      salePrice: 2.50,
    },
    {
      id: 'f3', name: 'Cera Protectora Auto Premium', category: 'auto',
      yieldAmount: 250, yieldUnit: 'g',
      ingredients: [
        { materialId: 'rm4', amount: 200 },
        { materialId: 'rm3', amount: 0.03 },
      ],
      salePrice: 1.80,
    },
    {
      id: 'f4', name: 'Limpiador de Tablero Auto', category: 'auto',
      yieldAmount: 500, yieldUnit: 'ml',
      ingredients: [
        { materialId: 'rm9', amount: 0.1 },
        { materialId: 'rm3', amount: 0.05 },
        { materialId: 'rm7', amount: 10 },
      ],
      salePrice: 1.50,
    },
    {
      id: 'f5', name: 'Spray Anti-Pulgas Natural', category: 'mascotas',
      yieldAmount: 500, yieldUnit: 'ml',
      ingredients: [
        { materialId: 'rm5', amount: 100 },
        { materialId: 'rm7', amount: 50 },
      ],
      salePrice: 1.40,
    },
    {
      id: 'f6', name: 'Shampoo Mascotas Avena', category: 'mascotas',
      yieldAmount: 350, yieldUnit: 'ml',
      ingredients: [
        { materialId: 'rm10', amount: 0.05 },
        { materialId: 'rm3', amount: 0.08 },
        { materialId: 'rm7', amount: 15 },
      ],
      salePrice: 1.60,
    },
    {
      id: 'f7', name: 'Limpiador Multiuso Lavanda', category: 'hogar',
      yieldAmount: 1000, yieldUnit: 'ml',
      ingredients: [
        { materialId: 'rm6', amount: 0.05 },
        { materialId: 'rm7', amount: 30 },
        { materialId: 'rm3', amount: 0.01 },
      ],
      salePrice: 0.90,
    },
    {
      id: 'f8', name: 'Desengrasante Industrial', category: 'hogar',
      yieldAmount: 1000, yieldUnit: 'ml',
      ingredients: [
        { materialId: 'rm6', amount: 0.08 },
        { materialId: 'rm9', amount: 0.05 },
      ],
      salePrice: 1.10,
    },
  ],

  products: [
    { id: 'p1', formulaId: 'f1', name: 'Serum Vitamina C 20%', category: 'serum', stock: 480, price: 2.80 },
    { id: 'p2', formulaId: 'f2', name: 'Serum Niacinamida 10%', category: 'serum', stock: 360, price: 2.50 },
    { id: 'p3', formulaId: 'f3', name: 'Cera Protectora Auto Premium', category: 'auto', stock: 200, price: 1.80 },
    { id: 'p4', formulaId: 'f4', name: 'Limpiador de Tablero Auto', category: 'auto', stock: 150, price: 1.50 },
    { id: 'p5', formulaId: 'f5', name: 'Spray Anti-Pulgas Natural', category: 'mascotas', stock: 300, price: 1.40 },
    { id: 'p6', formulaId: 'f6', name: 'Shampoo Mascotas Avena', category: 'mascotas', stock: 240, price: 1.60 },
    { id: 'p7', formulaId: 'f7', name: 'Limpiador Multiuso Lavanda', category: 'hogar', stock: 500, price: 0.90 },
    { id: 'p8', formulaId: 'f8', name: 'Desengrasante Industrial', category: 'hogar', stock: 400, price: 1.10 },
  ],

  // Ventas al MAYOR a dropshippers
  sales: [
    {
      id: 's1', date: '2026-03-08', invoiceNum: 'FAC-001',
      client: { name: 'DropBeauty VE', rif: 'J-40123456-7', contact: '+58 412-111-2222' },
      items: [
        { productId: 'p1', qty: 100, unitPrice: 2.80 },
        { productId: 'p2', qty: 80, unitPrice: 2.50 },
      ],
      status: 'completada', paymentMethod: 'Transferencia', notes: 'Entrega en Chacao',
    },
    {
      id: 's2', date: '2026-03-09', invoiceNum: 'FAC-002',
      client: { name: 'AutoShine Dropship', rif: 'J-41234567-8', contact: '+58 414-333-4444' },
      items: [
        { productId: 'p3', qty: 50, unitPrice: 1.80 },
        { productId: 'p4', qty: 60, unitPrice: 1.50 },
      ],
      status: 'completada', paymentMethod: 'Zelle', notes: '',
    },
    {
      id: 's3', date: '2026-03-10', invoiceNum: 'FAC-003',
      client: { name: 'PetWorld Express', rif: 'J-42345678-9', contact: '+58 416-555-6666' },
      items: [
        { productId: 'p5', qty: 120, unitPrice: 1.40 },
        { productId: 'p6', qty: 80, unitPrice: 1.60 },
      ],
      status: 'enviada', paymentMethod: 'Pago Móvil', notes: 'Envío por MRW a Valencia',
    },
    {
      id: 's4', date: '2026-03-11', invoiceNum: 'FAC-004',
      client: { name: 'CleanMax Distribuidora', rif: 'J-43456789-0', contact: '+58 424-777-8888' },
      items: [
        { productId: 'p7', qty: 200, unitPrice: 0.90 },
        { productId: 'p8', qty: 150, unitPrice: 1.10 },
      ],
      status: 'pendiente', paymentMethod: 'Crédito 30d', notes: 'Cliente recurrente - descuento 5%',
    },
    {
      id: 's5', date: '2026-03-13', invoiceNum: 'FAC-005',
      client: { name: 'DropBeauty VE', rif: 'J-40123456-7', contact: '+58 412-111-2222' },
      items: [
        { productId: 'p1', qty: 200, unitPrice: 2.70 },
        { productId: 'p2', qty: 150, unitPrice: 2.40 },
      ],
      status: 'pendiente', paymentMethod: 'Transferencia', notes: 'Pedido grande - precio especial',
    },
    {
      id: 's6', date: '2026-03-14', invoiceNum: 'FAC-006',
      client: { name: 'TodoHogar Drop', rif: 'J-44567890-1', contact: '+58 412-999-0000' },
      items: [
        { productId: 'p7', qty: 300, unitPrice: 0.85 },
        { productId: 'p5', qty: 100, unitPrice: 1.35 },
        { productId: 'p3', qty: 40, unitPrice: 1.75 },
      ],
      status: 'pendiente', paymentMethod: 'Zelle', notes: 'Nuevo cliente mayorista',
    },
  ],

  suppliers: [
    { id: 'sup1', name: 'QuimVen C.A.', contact: '+58 212-555-0101', email: 'ventas@quimven.com', rif: 'J-12345678-9', address: 'Zona Industrial La Yaguara, Caracas' },
    { id: 'sup2', name: 'BioInsumos Venezuela', contact: '+58 212-555-0202', email: 'pedidos@bioinsumos.com', rif: 'J-98765432-1', address: 'Los Ruices, Caracas' },
    { id: 'sup3', name: 'AutoChem Importadora', contact: '+58 212-555-0303', email: 'info@autochem.com', rif: 'J-45678901-2', address: 'La California, Caracas' },
    { id: 'sup4', name: 'AromaVzla', contact: '+58 212-555-0404', email: 'ventas@aromavzla.com', rif: 'J-11223344-5', address: 'El Marqués, Caracas' },
  ],

  // Clientes mayoristas recurrentes
  clients: [
    { id: 'cl1', name: 'DropBeauty VE', rif: 'J-40123456-7', contact: '+58 412-111-2222', email: 'compras@dropbeauty.com', type: 'Premium', creditDays: 15, totalPurchased: 0 },
    { id: 'cl2', name: 'AutoShine Dropship', rif: 'J-41234567-8', contact: '+58 414-333-4444', email: 'orders@autoshine.com', type: 'Regular', creditDays: 0, totalPurchased: 0 },
    { id: 'cl3', name: 'PetWorld Express', rif: 'J-42345678-9', contact: '+58 416-555-6666', email: 'pedidos@petworld.com', type: 'Regular', creditDays: 0, totalPurchased: 0 },
    { id: 'cl4', name: 'CleanMax Distribuidora', rif: 'J-43456789-0', contact: '+58 424-777-8888', email: 'compras@cleanmax.com', type: 'Premium', creditDays: 30, totalPurchased: 0 },
    { id: 'cl5', name: 'TodoHogar Drop', rif: 'J-44567890-1', contact: '+58 412-999-0000', email: 'info@todohogar.com', type: 'Nuevo', creditDays: 0, totalPurchased: 0 },
  ],
};

export const PAYMENT_METHODS = [
  'Transferencia',
  'Pago Móvil',
  'Zelle',
  'Efectivo USD',
  'Efectivo Bs',
  'Crédito 15d',
  'Crédito 30d',
];

export const CLIENT_TYPES = ['Nuevo', 'Regular', 'Premium', 'VIP'];
