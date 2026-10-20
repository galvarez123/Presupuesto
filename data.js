// ==============================================================================
// ESTADO BASE Y DATOS INICIALES (SINCRONIZADO CON SUPABASE CLOUD)
// Garantiza carga instantánea en 0ms y respaldo en caso de desconexión temporal
// ==============================================================================

window.FINANZAS_STATE = {
  entidadActiva: "TODOS", // 'TODOS', 'PERSONAL', 'MAGIA_CON_K', 'PAPEL'
  mesActivo: "2026-10",   // Filtro estricto mensual YYYY-MM (Sin acumulados globales)
  salarioExternoMensualUsd: 1000.00, // Salario de Trabajo por Fuera ($1,000.00 USD/mes)
  tasas: {
    tasa_bcv: 875.00,
    tasa_binance: 1015.00,
    brecha_pct: 16.00,
    factor_brecha: 1.1600,
    ut_valor_ves: 9.00,
    tcmmv_bcv_ves: 960.00 // Euro / Moneda de Mayor Valor BCV para cálculo de sanciones COT
  },
  tunelLive: {
    tunel_status: "ONLINE_REALTIME",
    mes_actual: "2026-10",
    magia_con_k: {
      modelos_activos: 37,
      stock_fisico: 94,
      stock_transito: 141,
      costo_inventario_usd: 173.01,
      pvp_inventario_usd: 1462.00,
      ventas_registradas: 10,
      unidades_vendidas: 10,
      ingresos_brutos_usd: 132.52,
      ingresos_brutos_ves: 134499.29,
      provision_alcaldia_sugerida_usd: 1.99,
      sueldo_fundador_asignado_usd: 0.00,
      por_mes: [
        { mes: "2026-10", ventas_registradas: 10, unidades_vendidas: 10, ingresos_brutos_usd: 132.52, ingresos_brutos_ves: 134499.29 },
        { mes: "2026-09", ventas_registradas: 11, unidades_vendidas: 11, ingresos_brutos_usd: 123.08, ingresos_brutos_ves: 124904.95 },
        { mes: "2026-08", ventas_registradas: 23, unidades_vendidas: 23, ingresos_brutos_usd: 237.71, ingresos_brutos_ves: 241259.06 },
        { mes: "2026-07", ventas_registradas: 31, unidades_vendidas: 31, ingresos_brutos_usd: 308.85, ingresos_brutos_ves: 313444.08 },
        { mes: "2026-06", ventas_registradas: 18, unidades_vendidas: 18, ingresos_brutos_usd: 157.67, ingresos_brutos_ves: 160029.60 }
      ]
    },
    papel: {
      skus_activos: 2,
      stock_vzla: 125,
      stock_agua: 52,
      valor_stock_landed_usd: 514.85,
      valor_stock_pvp_usd: 1000.00,
      despachos_count: 3,
      unidades_despachadas: 5,
      total_facturado_usd: 40.00,
      total_cobrado_usd: 41.00,
      balance_flujo_caja_usd: 1.00,
      clientes_activos: 4,
      provision_alcaldia_sugerida_usd: 0.80,
      sueldo_fundador_asignado_usd: 0.00,
      por_mes: [
        { mes: "2026-10", despachos_count: 3, unidades_despachadas: 5, total_facturado_usd: 40.00, total_cobrado_usd: 41.00 },
        { mes: "2026-09", despachos_count: 2, unidades_despachadas: 9, total_facturado_usd: 72.00, total_cobrado_usd: 68.00 },
        { mes: "2026-08", despachos_count: 4, unidades_despachadas: 15, total_facturado_usd: 120.00, total_cobrado_usd: 123.00 },
        { mes: "2026-07", despachos_count: 7, unidades_despachadas: 28, total_facturado_usd: 223.00, total_cobrado_usd: 260.00 },
        { mes: "2026-06", despachos_count: 7, unidades_despachadas: 31, total_facturado_usd: 266.00, total_cobrado_usd: 270.00 }
      ]
    }
  },
  entidades: [
    {
      codigo: "PERSONAL",
      nombre: "Finanzas Personales (Gabriel)",
      tipo: "PERSONAL",
      rif: "V-18XXXXXX-X",
      figura_legal: "Persona Natural Residente",
      sueldo_fundador_mensual_usd: 1000.00,
      alicuota_alcaldia_pct: 0,
      aplica_iva: false,
      aplica_igtf: false,
      exonerado_rne: false,
      color_hex: "#6366f1",
      icono: "👤",
      notas: "Ingreso principal: Salario de Trabajo por Fuera ($1,000.00 USD/mes). Presupuesto Mensual Base Cero con Casa, Mercado, Escuela, Carro, Deudas y Esparcimiento."
    },
    {
      codigo: "MAGIA_CON_K",
      nombre: "Magia con K (E-Commerce & Mazos)",
      tipo: "EMPRENDIMIENTO",
      rif: "J-50XXXXXX-X / RNE",
      figura_legal: "Firma Personal / Emprendimiento RNE",
      sueldo_fundador_mensual_usd: 0.00,
      alicuota_alcaldia_pct: 1.50,
      aplica_iva: true,
      aplica_igtf: true,
      exonerado_rne: true,
      color_hex: "#a855f7",
      icono: "🔮",
      notas: "Conectado por Túnel en Vivo a erp_articulos y erp_ventas_transacciones. Sin salario fijo asignado al socio (reinversión 100% en el negocio)."
    },
    {
      codigo: "PAPEL",
      nombre: "Papel (Distribución B2B Adhesivo & Foto)",
      tipo: "EMPRENDIMIENTO",
      rif: "J-50YYYYYY-Y",
      figura_legal: "PyME Comercializadora B2B",
      sueldo_fundador_mensual_usd: 0.00,
      alicuota_alcaldia_pct: 2.00,
      aplica_iva: true,
      aplica_igtf: true,
      exonerado_rne: false,
      color_hex: "#0ea5e9",
      icono: "📄",
      notas: "Conectado por Túnel en Vivo a erp_papel_inventario, erp_papel_ventas y erp_papel_pagos. Sin salario fijo asignado al socio (reinversión 100% en el negocio)."
    }
  ],
  billeteras: [
    { entidad_codigo: "PERSONAL", nombre: "Binance Pay / USDT (Bolsillo Personal)", moneda: "USDT", tipo_fondo: "OPERATIVO", saldo_origen: 0.00, es_intocable_fiscal: false },
    { entidad_codigo: "PERSONAL", nombre: "Banco Nacional (VES Pago Móvil Personal)", moneda: "VES", tipo_fondo: "OPERATIVO", saldo_origen: 0.00, es_intocable_fiscal: false },
    { entidad_codigo: "PERSONAL", nombre: "Efectivo USD (Billetera Física Personal)", moneda: "USD_CASH", tipo_fondo: "OPERATIVO", saldo_origen: 0.00, es_intocable_fiscal: false },
    { entidad_codigo: "PERSONAL", nombre: "Fondo de Paz / Emergencia (Reserva Intocable)", moneda: "USDT", tipo_fondo: "FONDO_PAZ_EMERGENCIA", saldo_origen: 0.00, es_intocable_fiscal: false },
    { entidad_codigo: "PERSONAL", nombre: "Bóveda de Sobres Anuales (Cuotas Escuela, Salud, Vehículo)", moneda: "USDT", tipo_fondo: "SOBRES_AHORRO", saldo_origen: 0.00, es_intocable_fiscal: false },
    { entidad_codigo: "MAGIA_CON_K", nombre: "Caja Operativa Magia con K (VES -> USDT)", moneda: "USDT", tipo_fondo: "OPERATIVO", saldo_origen: 0.00, es_intocable_fiscal: false },
    { entidad_codigo: "MAGIA_CON_K", nombre: "Fondo Reposición Inventario China (Magia con K)", moneda: "USDT", tipo_fondo: "OPERATIVO", saldo_origen: 0.00, es_intocable_fiscal: false },
    { entidad_codigo: "MAGIA_CON_K", nombre: "Bóveda Fiscal SENIAT & Alcaldía (Magia con K)", moneda: "USDT", tipo_fondo: "BOVEDA_FISCAL", saldo_origen: 0.00, es_intocable_fiscal: true },
    { entidad_codigo: "PAPEL", nombre: "Caja Operativa Cobranzas B2B (Papel)", moneda: "USD_CASH", tipo_fondo: "OPERATIVO", saldo_origen: 0.00, es_intocable_fiscal: false },
    { entidad_codigo: "PAPEL", nombre: "Fondo Importación Marítima (Papel)", moneda: "USDT", tipo_fondo: "OPERATIVO", saldo_origen: 0.00, es_intocable_fiscal: false },
    { entidad_codigo: "PAPEL", nombre: "Bóveda Fiscal IVA / Alcaldía / ISLR (Papel)", moneda: "USDT", tipo_fondo: "BOVEDA_FISCAL", saldo_origen: 0.00, es_intocable_fiscal: true }
  ],
  categorias: [
    { codigo: "PER_CASA", nombre: "Casa (Condominio, Servicios, Internet y Farmatodo)", bloque: "BLOQUE_A_VITALES", icono: "🏠", moneda_optima: "VES_BCV", presupuesto_mensual_usd: 180.00, gasto_acumulado_mes_usd: 95.69, meta_sobre_total_usd: 0, saldo_sobre_actual_usd: 0, aplica_desgravamen_islr: true, dia_vencimiento: 5, orden: 1, activa: true, notas: "Incluye Condominio, Corpoelec, Fibra Óptica (Fibex) y todas las compras de Farmatodo para el hogar." },
    { codigo: "PER_MERCADO", nombre: "Mercado (Supermercado, Proteínas y Consumos TDD Banesco)", bloque: "BLOQUE_A_VITALES", icono: "🛒", moneda_optima: "VES_BCV", presupuesto_mensual_usd: 260.00, gasto_acumulado_mes_usd: 162.57, meta_sobre_total_usd: 0, saldo_sobre_actual_usd: 0, aplica_desgravamen_islr: false, dia_vencimiento: null, orden: 2, activa: true, notas: "Compras de supermercado, proteínas, charcutería, feria y consumos de tarjeta Banesco TDD #3992." },
    { codigo: "PER_ESCUELA_HIJA", nombre: "Escuela de Hija (Mensualidad Fija Colegio $75)", bloque: "BLOQUE_A_VITALES", icono: "🎒", moneda_optima: "VES_BCV", presupuesto_mensual_usd: 75.00, gasto_acumulado_mes_usd: 75.00, meta_sobre_total_usd: 0, saldo_sobre_actual_usd: 0, aplica_desgravamen_islr: true, dia_vencimiento: 5, orden: 3, activa: true, notas: "Mensualidad fija del colegio ($75/mes). 100% deducible como Desgravamen Detallado de ISLR." },
    { codigo: "PER_CARRO", nombre: "Carro (Gasolina, Mantenimiento, Aceite, Cauchos y Repuestos)", bloque: "BLOQUE_A_VITALES", icono: "🚗", moneda_optima: "MIXTA", presupuesto_mensual_usd: 130.00, gasto_acumulado_mes_usd: 0.00, meta_sobre_total_usd: 0, saldo_sobre_actual_usd: 0, aplica_desgravamen_islr: false, dia_vencimiento: null, orden: 4, activa: true, notas: "Gastos mensuales del vehículo: gasolina, cambio de aceite, repuestos, mecánico, estacionamiento y seguro/RCV." },
    { codigo: "PER_DEUDAS", nombre: "Deudas (Pago de Deudas, Compromisos y Cuotas Mensuales)", bloque: "BLOQUE_D_FUTURO_DEUDAS", icono: "💳", moneda_optima: "USD_USDT", presupuesto_mensual_usd: 160.00, gasto_acumulado_mes_usd: 0.00, meta_sobre_total_usd: 0, saldo_sobre_actual_usd: 0, aplica_desgravamen_islr: false, dia_vencimiento: 15, orden: 5, activa: true, notas: "Abonos y pagos mensuales de deudas, préstamos personales, tarjetas o financiamientos pendientes." },
    { codigo: "PER_ESPARCIMIENTO", nombre: "Esparcimiento (Salidas Familia, Paseos, Streaming y Fin de Semana)", bloque: "BLOQUE_C_ESTILO_VIDA", icono: "🎡", moneda_optima: "MIXTA", presupuesto_mensual_usd: 95.00, gasto_acumulado_mes_usd: 31.26, meta_sobre_total_usd: 0, saldo_sobre_actual_usd: 0, aplica_desgravamen_islr: false, dia_vencimiento: null, orden: 6, activa: true, notas: "Salidas en familia, restaurantes, paseos de fin de semana, helados y recreación." },
    { codigo: "SOBRE_ESCUELA_CUOTAS", nombre: "Sobre Cuotas Especiales, Inscripción y Útiles (Escuela de Hija)", bloque: "BLOQUE_B_SOBRES", icono: "🎓", moneda_optima: "USD_USDT", presupuesto_mensual_usd: 35.00, gasto_acumulado_mes_usd: 25.00, meta_sobre_total_usd: 300.00, saldo_sobre_actual_usd: 0.00, aplica_desgravamen_islr: true, dia_vencimiento: 15, orden: 7, activa: true, notas: "Apartado mensual para cuotas especiales del colegio, inscripción anual, lista de útiles y uniformes." },
    { codigo: "SOBRE_SALUD_VEHICULO", nombre: "Sobre Salud, Consultas Médicas y Odontología", bloque: "BLOQUE_B_SOBRES", icono: "🏥", moneda_optima: "VES_BCV", presupuesto_mensual_usd: 25.00, gasto_acumulado_mes_usd: 15.52, meta_sobre_total_usd: 300.00, saldo_sobre_actual_usd: 0.00, aplica_desgravamen_islr: true, dia_vencimiento: 20, orden: 8, activa: true, notas: "Consultas médicas, odontología, exámenes de laboratorio y emergencias de salud familiar." },
    { codigo: "FUT_FONDO_PAZ", nombre: "Fondo de Paz y Emergencia Personal (Reserva USDT)", bloque: "BLOQUE_D_FUTURO_DEUDAS", icono: "🛡️", moneda_optima: "USD_USDT", presupuesto_mensual_usd: 40.00, gasto_acumulado_mes_usd: 40.00, meta_sobre_total_usd: 2400.00, saldo_sobre_actual_usd: 0.00, aplica_desgravamen_islr: false, dia_vencimiento: 1, orden: 9, activa: true, notas: "Págate a ti primero: reserva mensual en USDT para imprevistos familiares." }
  ],
  obligacionesFiscales: [
    { codigo: "FIS_MAGIA_IVA", entidad_codigo: "MAGIA_CON_K", organismo: "SENIAT", tributo: "IVA Ordinario / Débito vs Crédito Fiscal", frecuencia: "MENSUAL", alicuota_referencia: "16% General", dia_vencimiento_estimado: "Primeros 15 días del mes siguiente", monto_provisionado_usd: 82.50, monto_meta_periodo_usd: 95.00, riesgo_multa_tcmmv: "100 a 150 TCMMV (COT) + Intereses", estado: "PROVISIONANDO", notas: "El IVA cobrado en ventas facturadas se separa en la Bóveda Fiscal y no se toca." },
    { codigo: "FIS_MAGIA_ALCALDIA", entidad_codigo: "MAGIA_CON_K", organismo: "ALCALDIA", tributo: "Impuesto Actividades Económicas (Ingresos Brutos)", frecuencia: "MENSUAL", alicuota_referencia: "1.50% s/ Ingresos Brutos (o Mínimo Tributable)", dia_vencimiento_estimado: "Día 10 al 20 de cada mes (LOCAPTEM)", monto_provisionado_usd: 28.30, monto_meta_periodo_usd: 30.00, riesgo_multa_tcmmv: "Clausura temporal + Multa en TCMMV", estado: "AL_DIA", notas: "Declarar siempre aunque haya meses de baja facturación para cubrir el Mínimo Tributable municipal." },
    { codigo: "FIS_MAGIA_IGTF", entidad_codigo: "MAGIA_CON_K", organismo: "SENIAT", tributo: "IGTF Pagos en Divisas / Cripto (3%)", frecuencia: "QUINCENAL", alicuota_referencia: "3.00% en pagos USD/USDT a SPE", dia_vencimiento_estimado: "Según operación bancaria / percepción", monto_provisionado_usd: 14.00, monto_meta_periodo_usd: 14.00, riesgo_multa_tcmmv: "Multa por omisión de percepción", estado: "AL_DIA", notas: "Priorizar pagos a proveedores nacionales en VES a tasa BCV para ahorrar el 3% de IGTF + 16% brecha." },
    { codigo: "FIS_MAGIA_RNE", entidad_codigo: "MAGIA_CON_K", organismo: "SENIAT / RNE", tributo: "Renovación Registro Nacional de Emprendimientos y LPP", frecuencia: "ANUAL", alicuota_referencia: "Exoneración temporal RNE (Vigencia 2 años)", dia_vencimiento_estimado: "Verificar vencimiento certificado RNE", monto_provisionado_usd: 18.00, monto_meta_periodo_usd: 25.00, riesgo_multa_tcmmv: "Pérdida de exoneración LPP 9% / ISLR", estado: "EXONERADO_RNE", notas: "Mantener ingresos anuales dentro del tope legal RNE o planificar transición a PyME / C.A." },
    { codigo: "FIS_PAPEL_IVA", entidad_codigo: "PAPEL", organismo: "SENIAT", tributo: "IVA Ventas B2B Papel Adhesivo & Fotográfico", frecuencia: "MENSUAL", alicuota_referencia: "16% General (Retenciones 75% SPE)", dia_vencimiento_estimado: "Primeros 15 días del mes", monto_provisionado_usd: 64.20, monto_meta_periodo_usd: 75.00, riesgo_multa_tcmmv: "100 a 150 TCMMV (COT)", estado: "PROVISIONANDO", notas: "Controlar comprobantes de retención de IVA si los clientes B2B son Sujetos Pasivos Especiales." },
    { codigo: "FIS_PAPEL_ALCALDIA", entidad_codigo: "PAPEL", organismo: "ALCALDIA", tributo: "Patente Industria y Comercio (Mayorista Papel)", frecuencia: "MENSUAL", alicuota_referencia: "2.00% Ingresos Brutos Cobrados/Facturados", dia_vencimiento_estimado: "Primeros 15 días del mes", monto_provisionado_usd: 24.20, monto_meta_periodo_usd: 28.00, riesgo_multa_tcmmv: "Recargos moratorios + Multa TCMMV", estado: "AL_DIA", notas: "Apartado automático del 2% por cada cobro registrado en erp_papel_pagos." },
    { codigo: "FIS_PAPEL_ISLR", entidad_codigo: "PAPEL", organismo: "SENIAT", tributo: "Provisión ISLR Ejercicio + Retenciones Decreto 1.808", frecuencia: "MENSUAL", alicuota_referencia: "15% - 34% s/ Utilidad Neta Fiscal", dia_vencimiento_estimado: "Retenciones: primeros 10 días / Anual: Marzo", monto_provisionado_usd: 30.00, monto_meta_periodo_usd: 45.00, riesgo_multa_tcmmv: "100% a 300% del tributo omitido", estado: "PROVISIONANDO", notas: "Exigir factura fiscal en fletes nacionales y aduana para deducir costos legalmente." },
    { codigo: "FIS_PER_ISLR", entidad_codigo: "PERSONAL", organismo: "SENIAT", tributo: "Declaración ISLR Persona Natural + Carpeta Desgravámenes", frecuencia: "ANUAL", alicuota_referencia: "Tarifa N° 1 (774 UT o Desgravámenes Detallados)", dia_vencimiento_estimado: "1 de Enero al 31 de Marzo", monto_provisionado_usd: 30.00, monto_meta_periodo_usd: 60.00, riesgo_multa_tcmmv: "50 a 150 TCMMV por declaración extemporánea", estado: "AL_DIA", notas: "Archivar facturas fiscales de Escuela de Hija, Salud/Odontología y Servicios de Vivienda a nombre de tu RIF V-." }
  ],
  crucesPatrimoniales: [
    { id: "c1", fecha: "2026-10-12", emprendimiento_codigo: "MAGIA_CON_K", direccion: "SOCIO_PRESTA_A_NEGOCIO", concepto: "Embalaje y guías MRW/Zoom pagadas con Pago Móvil Personal de Gabriel", monto_usd_real: 24.14, moneda_origen: "VES", estado: "PENDIENTE", notas: "Magia con K debe reembolsar $24.14 USDT al bolsillo personal." },
    { id: "c2", fecha: "2026-10-14", emprendimiento_codigo: "PAPEL", direccion: "SOCIO_PRESTA_A_NEGOCIO", concepto: "Flete despacho rollos Papel Adhesivo pagado con efectivo personal", monto_usd_real: 20.00, moneda_origen: "USD_CASH", estado: "PENDIENTE", notas: "Papel debe reembolsar $20.00 USD al bolsillo personal." },
    { id: "c3", fecha: "2026-10-16", emprendimiento_codigo: "PAPEL", direccion: "NEGOCIO_ADELANTA_A_SOCIO", concepto: "Almuerzo familiar domingo pagado desde caja chica de Papel (Descontado de Esparcimiento)", monto_usd_real: 15.00, moneda_origen: "USD_CASH", estado: "PENDIENTE", notas: "Compensar contra el reembolso pendiente de Papel ($20 - $15 = $5 netos a favor del socio)." }
  ],
  transacciones: [
    { id: "2fe74713-d349-489a-92d5-0da7e0b560f5", fecha: "2026-10-19", entidad_codigo: "PERSONAL", tipo_movimiento: "GASTO_PERSONAL", categoria_codigo: "PER_MERCADO", concepto: "[Foto Factura] Comprobante escaneado (J603338080) [RIF/Fac: J603338080 / #87-38]", moneda_origen: "VES", monto_origen: 96.70, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 0.11, monto_usd_real: 0.10, ahorro_cambiario_usd: 0.01, tiene_factura_fiscal: true, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null, estado_conciliacion: "PENDIENTE" },
    { id: "68cc420b-1df5-4811-92a5-3ee53b26b5ad", fecha: "2026-10-17", entidad_codigo: "PERSONAL", tipo_movimiento: "INGRESO_PERSONAL", categoria_codigo: null, concepto: "[Ayuda a Esposa - Reembolsado en Efectivo] Pago One Way Cargo ($26 USDT -> Recibido $26 Efectivo)", moneda_origen: "USDT", monto_origen: 26.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 26.00, monto_usd_real: 26.00, ahorro_cambiario_usd: 0.00, tiene_factura_fiscal: false, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null, estado_conciliacion: "CONFIRMADO" },
    { id: "3e744c2f-1b17-49e0-88b5-8a1b28341405", fecha: "2026-10-17", entidad_codigo: "PERSONAL", tipo_movimiento: "GASTO_PERSONAL", categoria_codigo: "PER_CASA", concepto: "[Gmail] Factura Electrónica Farmatodo #FTD-552190 (Asignado a Casa)", moneda_origen: "VES", monto_origen: 12250.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 14.00, monto_usd_real: 12.07, ahorro_cambiario_usd: 1.93, tiene_factura_fiscal: true, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null, estado_conciliacion: "PENDIENTE" },
    { id: "2d587c79-1eff-41ea-adc7-4e7f65c8e434", fecha: "2026-10-16", entidad_codigo: "PERSONAL", tipo_movimiento: "GASTO_CRUZADO_NEGOCIO_PAGA_SOCIO", categoria_codigo: "PER_ESPARCIMIENTO", concepto: "Almuerzo familiar domingo pagado por emergencia con tarjeta de Caja Papel", moneda_origen: "USD_CASH", monto_origen: 15.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 15.00, monto_usd_real: 15.00, ahorro_cambiario_usd: 0.00, tiene_factura_fiscal: false, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: true, entidad_pagadora_cruce: "PAPEL", estado_conciliacion: "PENDIENTE" },
    { id: "49a3a91b-b9dc-4284-ba02-6f9da45f208e", fecha: "2026-10-15", entidad_codigo: "PERSONAL", tipo_movimiento: "GASTO_PERSONAL", categoria_codigo: "PER_MERCADO", concepto: "[Gmail / Banesco TDD #3992] Consumo Punto de Venta Comercio (Mercado)", moneda_origen: "VES", monto_origen: 17582.45, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 20.09, monto_usd_real: 17.32, ahorro_cambiario_usd: 2.77, tiene_factura_fiscal: true, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null, estado_conciliacion: "PENDIENTE" },
    { id: "b1232628-209d-44e3-a467-6b55d5ca355d", fecha: "2026-10-12", entidad_codigo: "MAGIA_CON_K", tipo_movimiento: "GASTO_OPERATIVO_NEGOCIO", categoria_codigo: null, concepto: "[Gmail / Binance Card] Compra Inventario China en Alibaba.com (Magia con K)", moneda_origen: "USDT", monto_origen: 118.44, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 118.44, monto_usd_real: 118.44, ahorro_cambiario_usd: 0.00, tiene_factura_fiscal: true, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null, estado_conciliacion: "CONFIRMADO" },
    { id: "e66b076e-36de-4838-96c3-05abfd5d2f3f", fecha: "2026-10-11", entidad_codigo: "PERSONAL", tipo_movimiento: "GASTO_PERSONAL", categoria_codigo: "PER_MERCADO", concepto: "[Gmail / Banesco TDD #3992] Consumo Punto de Venta Comercio (Mercado)", moneda_origen: "VES", monto_origen: 39281.66, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 44.89, monto_usd_real: 38.70, ahorro_cambiario_usd: 6.19, tiene_factura_fiscal: true, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null, estado_conciliacion: "PENDIENTE" },
    { id: "b8cb89eb-373a-43f8-8829-97a396c21116", fecha: "2026-10-11", entidad_codigo: "PERSONAL", tipo_movimiento: "GASTO_PERSONAL", categoria_codigo: "PER_MERCADO", concepto: "[Gmail / Banesco TDD #3992] Consumo Punto de Venta Comercio (Mercado)", moneda_origen: "VES", monto_origen: 24918.66, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 28.48, monto_usd_real: 24.55, ahorro_cambiario_usd: 3.93, tiene_factura_fiscal: true, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null, estado_conciliacion: "PENDIENTE" },
    { id: "d0409772-69f5-4021-8dd8-aedf278ae159", fecha: "2026-10-11", entidad_codigo: "PERSONAL", tipo_movimiento: "GASTO_PERSONAL", categoria_codigo: "PER_ESPARCIMIENTO", concepto: "[Gmail / Banesco TDD #3992] Consumo Punto de Venta Domingo (Esparcimiento)", moneda_origen: "VES", monto_origen: 16500.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 18.86, monto_usd_real: 16.26, ahorro_cambiario_usd: 2.60, tiene_factura_fiscal: true, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null, estado_conciliacion: "PENDIENTE" },
    { id: "7a7d7df5-274e-4e9b-9bb0-63456daa64ba", fecha: "2026-10-10", entidad_codigo: "PERSONAL", tipo_movimiento: "GASTO_PERSONAL", categoria_codigo: "PER_CASA", concepto: "[Gmail] Factura Fiscal SENIAT #FBX-88412 - Servicio Fibra Óptica Octubre", moneda_origen: "VES", monto_origen: 30625.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 35.00, monto_usd_real: 30.17, ahorro_cambiario_usd: 4.83, tiene_factura_fiscal: true, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null, estado_conciliacion: "CONFIRMADO" },
    { id: "335f2314-1544-443d-b5f3-29dd030511cc", fecha: "2026-10-10", entidad_codigo: "PERSONAL", tipo_movimiento: "GASTO_PERSONAL", categoria_codigo: "SOBRE_SALUD_VEHICULO", concepto: "Consulta Odontológica + Farmacia con Factura Fiscal SENIAT", moneda_origen: "VES", monto_origen: 15750.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 18.00, monto_usd_real: 15.52, ahorro_cambiario_usd: 2.48, tiene_factura_fiscal: true, aplica_desgravamen_islr: true, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null, estado_conciliacion: "CONFIRMADO" },
    { id: "5f122be4-0301-4765-8b5d-8cbb353b5b4d", fecha: "2026-10-08", entidad_codigo: "PERSONAL", tipo_movimiento: "GASTO_PERSONAL", categoria_codigo: "PER_MERCADO", concepto: "Compra Supermercado Quincena 1 (Facturado en Bs a BCV sin IGTF)", moneda_origen: "VES", monto_origen: 83125.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 95.00, monto_usd_real: 81.90, ahorro_cambiario_usd: 13.10, tiene_factura_fiscal: true, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null, estado_conciliacion: "CONFIRMADO" },
    { id: "fa62af32-75d2-4513-9924-cb68d36964a2", fecha: "2026-10-06", entidad_codigo: "PERSONAL", tipo_movimiento: "APORTE_SOBRE", categoria_codigo: "SOBRE_ESCUELA_CUOTAS", concepto: "Apartado Mensual para Cuotas Especiales / Inscripción Colegio de Hija", moneda_origen: "USDT", monto_origen: 25.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 25.00, monto_usd_real: 25.00, ahorro_cambiario_usd: 0.00, tiene_factura_fiscal: false, aplica_desgravamen_islr: true, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null, estado_conciliacion: "CONFIRMADO" },
    { id: "2b16716b-994e-4528-bfbb-07763b5adc05", fecha: "2026-10-05", entidad_codigo: "PERSONAL", tipo_movimiento: "GASTO_PERSONAL", categoria_codigo: "PER_ESCUELA_HIJA", concepto: "Mensualidad Colegio de Hija (Octubre — $75.00 USD Fijo)", moneda_origen: "VES", monto_origen: 65625.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 75.00, monto_usd_real: 64.66, ahorro_cambiario_usd: 10.34, tiene_factura_fiscal: true, aplica_desgravamen_islr: true, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null, estado_conciliacion: "CONFIRMADO" },
    { id: "d8351728-994b-4340-a306-a24249969b09", fecha: "2026-10-05", entidad_codigo: "PERSONAL", tipo_movimiento: "GASTO_PERSONAL", categoria_codigo: "PER_CASA", concepto: "Pago Condominio y Corpoelec en Bs a tasa BCV (Liquidando USDT en P2P)", moneda_origen: "VES", monto_origen: 54250.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 62.00, monto_usd_real: 53.45, ahorro_cambiario_usd: 8.55, tiene_factura_fiscal: true, aplica_desgravamen_islr: true, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null, estado_conciliacion: "CONFIRMADO" },
    { id: "21c3fab3-3751-4987-9df2-69dfb0617cef", fecha: "2026-10-03", entidad_codigo: "PERSONAL", tipo_movimiento: "APORTE_SOBRE", categoria_codigo: "FUT_FONDO_PAZ", concepto: "Págate a ti primero: Aporte mensual Fondo de Emergencia USDT", moneda_origen: "USDT", monto_origen: 40.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 40.00, monto_usd_real: 40.00, ahorro_cambiario_usd: 0.00, tiene_factura_fiscal: false, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null, estado_conciliacion: "CONFIRMADO" },
    { id: "01fe9f9e-5ed1-4cae-beb8-5498478a6971", fecha: "2026-10-01", entidad_codigo: "PERSONAL", tipo_movimiento: "INGRESO_PERSONAL", categoria_codigo: null, concepto: "Salario Mensual — Trabajo por Fuera ($1,000.00 USD)", moneda_origen: "USD_CASH", monto_origen: 1000.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 1000.00, monto_usd_real: 1000.00, ahorro_cambiario_usd: 0.00, tiene_factura_fiscal: false, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null, estado_conciliacion: "CONFIRMADO" }
  ],
  gmailFacturas: [
    { gmail_message_id: "1a14ace34d97c600", fecha_correo: "2026-10-17", remitente: "One Way Cargo <info@onewaycargo.net>", asunto: "Pago One Way Cargo (Ayuda a Esposa -> Recibido en Efectivo $26 USD)", rif_detectado: "", numero_factura: "460462490631839744", entidad_asignada: "PERSONAL", categoria_asignada: "PASE_EFECTIVO_ESPOSA", moneda_detectada: "USDT", monto_origen: 26.00, monto_usd_bcv: 26.00, monto_usd_real: 26.00, tiene_factura_fiscal: true, aplica_desgravamen_islr: false },
    { gmail_message_id: "gmail-farmatodo-salud-oct-2026", fecha_correo: "2026-10-17", remitente: "facturacion.electronica@farmatodo.com", asunto: "Factura Electrónica Farmatodo #FTD-552190 (Casa)", rif_detectado: "J-00020200-1", numero_factura: "FTD-552190", entidad_asignada: "PERSONAL", categoria_asignada: "PER_CASA", moneda_detectada: "VES", monto_origen: 12250.00, monto_usd_bcv: 14.00, monto_usd_real: 12.07, tiene_factura_fiscal: true, aplica_desgravamen_islr: false },
    { gmail_message_id: "1a140d4d8f177c99", fecha_correo: "2026-10-15", remitente: "Notificacion@banesco.com", asunto: "Consumo Punto de Venta Banesco TDD #3992 (Mercado / Compras)", rif_detectado: "", numero_factura: "3992", entidad_asignada: "PERSONAL", categoria_asignada: "PER_MERCADO", moneda_detectada: "VES", monto_origen: 17582.45, monto_usd_bcv: 20.09, monto_usd_real: 17.32, tiene_factura_fiscal: true, aplica_desgravamen_islr: false },
    { gmail_message_id: "gmail-ml-comision-oct-2026", fecha_correo: "2026-10-15", remitente: "no-reply@mercadolibre.com.ve", asunto: "Factura mensual de cargos por venta Mercado Libre Venezuela", rif_detectado: "J-30684267-5", numero_factura: "MLV-0094821", entidad_asignada: "MAGIA_CON_K", categoria_asignada: "", moneda_detectada: "VES", monto_origen: 38325.00, monto_usd_bcv: 43.80, monto_usd_real: 37.76, tiene_factura_fiscal: true, aplica_desgravamen_islr: false },
    { gmail_message_id: "1a1306d5cf5eceb5", fecha_correo: "2026-10-12", remitente: "Binance <do-not-reply@ses.binance.com>", asunto: "Binance Card - Compra Alibaba.com (Inventario Magia con K)", rif_detectado: "", numero_factura: "ALIBABA", entidad_asignada: "MAGIA_CON_K", categoria_asignada: "", moneda_detectada: "USDT", monto_origen: 118.44, monto_usd_bcv: 118.44, monto_usd_real: 118.44, tiene_factura_fiscal: true, aplica_desgravamen_islr: false },
    { gmail_message_id: "1a12d36830194d3d", fecha_correo: "2026-10-11", remitente: "Notificacion@banesco.com", asunto: "Consumo Punto de Venta Banesco TDD #3992 (Mercado / Compras)", rif_detectado: "", numero_factura: "3992", entidad_asignada: "PERSONAL", categoria_asignada: "PER_MERCADO", moneda_detectada: "VES", monto_origen: 39281.66, monto_usd_bcv: 44.89, monto_usd_real: 38.70, tiene_factura_fiscal: true, aplica_desgravamen_islr: false },
    { gmail_message_id: "1a12cf824f86e147", fecha_correo: "2026-10-11", remitente: "Notificacion@banesco.com", asunto: "Consumo Punto de Venta Banesco TDD #3992 (Mercado / Compras)", rif_detectado: "", numero_factura: "3992", entidad_asignada: "PERSONAL", categoria_asignada: "PER_MERCADO", moneda_detectada: "VES", monto_origen: 24918.66, monto_usd_bcv: 28.48, monto_usd_real: 24.55, tiene_factura_fiscal: true, aplica_desgravamen_islr: false },
    { gmail_message_id: "1a12c3cf88d4c144", fecha_correo: "2026-10-11", remitente: "Notificacion@banesco.com", asunto: "Consumo Punto de Venta Banesco TDD #3992 (Salida / Esparcimiento)", rif_detectado: "", numero_factura: "3992", entidad_asignada: "PERSONAL", categoria_asignada: "PER_ESPARCIMIENTO", moneda_detectada: "VES", monto_origen: 16500.00, monto_usd_bcv: 18.86, monto_usd_real: 16.26, tiene_factura_fiscal: true, aplica_desgravamen_islr: false },
    { gmail_message_id: "gmail-fibex-oct-2026", fecha_correo: "2026-10-10", remitente: "facturacion@fibextelecom.net", asunto: "Factura Fiscal SENIAT #FBX-88412 - Servicio Fibra Óptica Octubre", rif_detectado: "J-40123987-1", numero_factura: "FBX-88412", entidad_asignada: "PERSONAL", categoria_asignada: "PER_CASA", moneda_detectada: "VES", monto_origen: 30625.00, monto_usd_bcv: 35.00, monto_usd_real: 30.17, tiene_factura_fiscal: true, aplica_desgravamen_islr: false }
  ]
};
