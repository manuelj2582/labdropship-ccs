# 🧪 LabDropship CCS

Sistema de gestión integral para laboratorio de productos de dropshipping en Caracas, Venezuela.

## Módulos

- **📊 Dashboard** — KPIs, alertas, ventas recientes
- **📦 Inventario** — Materias primas con alertas de stock mínimo
- **🧪 Fórmulas** — Recetas de producción con cálculo de costos y márgenes
- **⚙️ Producción** — Órdenes de producción con descuento automático de materiales
- **🏷️ Productos** — Catálogo por categorías (Skincare, Auto, Mascotas, Hogar)
- **💰 Ventas Mayor** — Pedidos al mayor para dropshippers con facturación
- **👥 Clientes** — Gestión de clientes mayoristas (tipos, crédito, historial)
- **🚚 Proveedores** — Directorio de proveedores con materiales asociados
- **📈 Reportes** — Rentabilidad, análisis por categoría, ranking de clientes

## Categorías de Productos

| Línea | Ejemplos |
|-------|----------|
| 💧 Serums & Skincare | Serum Vitamina C, Serum Niacinamida |
| 🚗 Automotriz | Cera Protectora, Limpiador de Tablero |
| 🐾 Mascotas | Spray Anti-Pulgas, Shampoo Avena |
| 🏠 Limpieza & Hogar | Limpiador Multiuso, Desengrasante Industrial |

## Setup Local

```bash
# Clonar el repositorio
git clone https://github.com/TU_USUARIO/labdropship-ccs.git
cd labdropship-ccs

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Deploy en Vercel

### Opción 1: Desde GitHub (recomendado)

1. Sube el proyecto a un repositorio en GitHub
2. Ve a [vercel.com](https://vercel.com) e inicia sesión
3. Click en **"Add New → Project"**
4. Importa tu repositorio de GitHub
5. Vercel detecta automáticamente que es un proyecto Vite
6. Click en **"Deploy"**

### Opción 2: Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy a producción
vercel --prod
```

## Subir a GitHub

```bash
# Inicializar git
git init
git add .
git commit -m "feat: sistema labdropship-ccs v1.0"

# Crear repo en GitHub y conectar
git remote add origin https://github.com/TU_USUARIO/labdropship-ccs.git
git branch -M main
git push -u origin main
```

## Tech Stack

- **React 18** con Hooks
- **Vite** como bundler
- **Lucide React** para iconos
- **Recharts** para gráficos (preparado)
- **Vercel** para hosting

## Estructura del Proyecto

```
labdropship-ccs/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── UI.jsx          # Componentes reutilizables
│   │   ├── Sidebar.jsx     # Navegación lateral
│   │   ├── Dashboard.jsx   # Panel principal
│   │   ├── Inventory.jsx   # Gestión de materias primas
│   │   ├── Formulas.jsx    # Recetas de producción
│   │   ├── Production.jsx  # Centro de producción
│   │   ├── Products.jsx    # Catálogo de productos
│   │   ├── Sales.jsx       # Ventas al mayor
│   │   ├── Clients.jsx     # Clientes dropshippers
│   │   ├── Suppliers.jsx   # Proveedores
│   │   └── Reports.jsx     # Reportes y análisis
│   ├── data/
│   │   └── initialData.js  # Datos iniciales y constantes
│   ├── styles/
│   │   └── global.css      # Estilos globales
│   ├── utils.js            # Funciones utilitarias
│   ├── App.jsx             # Componente principal
│   └── main.jsx            # Entry point
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── README.md
```

## Notas

- Los datos se mantienen en memoria (state de React). Para persistencia, conectar a una base de datos (Supabase, Firebase, etc.)
- Los precios están en USD ya que es el modelo típico de dropshipping en Venezuela
- El sistema está diseñado para ventas B2B al mayor, no al detal

---

Hecho con 🧪 en Caracas, Venezuela
