// ==============================================================================
// CONFIGURACIÓN DE SUPABASE & TÚNEL EN VIVO CON MAGIA ERP Y PAPEL B2B
// Conecta el Sistema Privado de Presupuesto Personal y Fiscal a la misma nube de Magia
// ==============================================================================

const SUPABASE_CONFIG = {
  url: "https://pobekklqgevauexuhrnu.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYmVra2xxZ2V2YXVleHVocm51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMDk2MjcsImV4cCI6MjEwNzY4NTYyN30.PQAtBljmv06PiSUrEZuroMYke97StreEf0720IBBJlI",
  publishableKey: "sb_publishable_wUdO5mH3gNuxjyTSc3UWLw_7mp3_f-2",

  // URL del aplicativo hermano Magia ERP
  magiaErpUrl: "https://magia-six.vercel.app",

  rpc: {
    tunelLive: "rpc_tunel_presupuesto_live",
    magiaKpis: "rpc_resumen_dashboard_kpis"
  },

  tables: {
    entidades: "fin_entidades",
    billeteras: "fin_billeteras",
    categorias: "fin_presupuesto_categorias",
    transacciones: "fin_transacciones",
    cruces: "fin_cruces_patrimoniales",
    obligacionesFiscales: "fin_obligaciones_fiscales",
    // Tablas conectadas por el Túnel desde Magia con K y Papel
    tasasCambio: "erp_tasas_cambio",
    magiaArticulos: "erp_articulos",
    magiaVentas: "erp_ventas_transacciones",
    papelInventario: "erp_papel_inventario",
    papelVentas: "erp_papel_ventas",
    papelPagos: "erp_papel_pagos",
    papelClientes: "erp_papel_clientes"
  }
};

if (typeof window !== "undefined") {
  window.SUPABASE_CONFIG = SUPABASE_CONFIG;

  if (window.supabase && typeof window.supabase.createClient === "function") {
    window.supabaseClient = window.supabase.createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
    console.log("🌉 Túnel Supabase Cloud (Presupuesto + Magia con K + Papel) inicializado.");
  }
}
