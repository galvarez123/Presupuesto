-- ==============================================================================
-- ESQUEMA SQL DE PRESUPUESTO PERSONAL, SEPARACIÓN DE EMPRENDIMIENTOS (MAGIA CON K & PAPEL)
-- Y BÓVEDA FISCAL VENEZUELA + TÚNEL RPC EN TIEMPO REAL (SUPABASE CLOUD)
-- Proyecto Supabase: https://pobekklqgevauexuhrnu.supabase.co
-- ==============================================================================

-- Este esquema ya fue aplicado en vivo en Supabase Cloud mediante las migraciones:
-- 1. create_finanzas_presupuesto_and_tunel_magia_papel
-- 2. seed_finanzas_and_create_rpc_tunel_live_v2

-- Tablas activas:
-- - public.fin_entidades (PERSONAL, MAGIA_CON_K, PAPEL)
-- - public.fin_billeteras (11 billeteras separadas por entidad y moneda VES / USD / USDT)
-- - public.fin_presupuesto_categorias (16 categorías de Presupuesto Base Cero y Sobres Digitales)
-- - public.fin_transacciones (Libro mayor bimonetario con ahorro cambiario y soporte SENIAT)
-- - public.fin_cruces_patrimoniales (Cuenta Puente Socio <-> Emprendimientos para gastos cruzados)
-- - public.fin_obligaciones_fiscales (SENIAT IVA, IGTF 3%, ISLR, Alcaldía LOCAPTEM, RNE/LPP)
-- - Función RPC del Túnel: public.rpc_tunel_presupuesto_live()
