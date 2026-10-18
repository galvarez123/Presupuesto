// ==============================================================================
// ESTADO BASE Y DATOS INICIALES (SINCRONIZADO CON SUPABASE CLOUD)
// Garantiza carga instantánea en 0ms y respaldo en caso de desconexión temporal
// ==============================================================================

window.FINANZAS_STATE = {
  entidadActiva: "TODOS", // 'TODOS', 'PERSONAL', 'MAGIA_CON_K', 'PAPEL'
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
    magia_con_k: {
      modelos_activos: 37,
      stock_fisico: 94,
      stock_transito: 141,
      costo_inventario_usd: 173.01,
      pvp_inventario_usd: 1462.00,
      ventas_registradas: 136,
      unidades_vendidas: 136,
      ingresos_brutos_usd: 1049.62,
      ingresos_brutos_ves: 1065361.65,
      provision_alcaldia_sugerida_usd: 15.74,
      sueldo_fundador_asignado_usd: 350.00
    },
    papel: {
      skus_activos: 2,
      stock_vzla: 125,
      stock_agua: 52,
      valor_stock_landed_usd: 514.85,
      valor_stock_pvp_usd: 1000.00,
      despachos_count: 23,
      unidades_despachadas: 88,
      total_facturado_usd: 721.00,
      total_cobrado_usd: 762.00,
      balance_flujo_caja_usd: 41.00,
      clientes_activos: 4,
      provision_alcaldia_sugerida_usd: 14.42,
      sueldo_fundador_asignado_usd: 250.00
    }
  },
  entidades: [
    {
      codigo: "PERSONAL",
      nombre: "Finanzas Personales (Gabriel)",
      tipo: "PERSONAL",
      rif: "V-18XXXXXX-X",
      figura_legal: "Persona Natural Residente",
      sueldo_fundador_mensual_usd: 0,
      alicuota_alcaldia_pct: 0,
      aplica_iva: false,
      aplica_igtf: false,
      exonerado_rne: false,
      color_hex: "#6366f1",
      icono: "👤",
      notas: "Presupuesto Base Cero, Sobres Digitales (Sinking Funds), Fondo de Paz y Desgravámenes ISLR Persona Natural."
    },
    {
      codigo: "MAGIA_CON_K",
      nombre: "Magia con K (E-Commerce & Mazos)",
      tipo: "EMPRENDIMIENTO",
      rif: "J-50XXXXXX-X / RNE",
      figura_legal: "Firma Personal / Emprendimiento RNE",
      sueldo_fundador_mensual_usd: 350.00,
      alicuota_alcaldia_pct: 1.50,
      aplica_iva: true,
      aplica_igtf: true,
      exonerado_rne: true,
      color_hex: "#a855f7",
      icono: "🔮",
      notas: "Conectado por Túnel en Vivo a erp_articulos (37 modelos) y erp_ventas_transacciones."
    },
    {
      codigo: "PAPEL",
      nombre: "Papel (Distribución B2B Adhesivo & Foto)",
      tipo: "EMPRENDIMIENTO",
      rif: "J-50YYYYYY-Y",
      figura_legal: "PyME Comercializadora B2B",
      sueldo_fundador_mensual_usd: 250.00,
      alicuota_alcaldia_pct: 2.00,
      aplica_iva: true,
      aplica_igtf: true,
      exonerado_rne: false,
      color_hex: "#0ea5e9",
      icono: "📄",
      notas: "Conectado por Túnel en Vivo a erp_papel_inventario, erp_papel_ventas y erp_papel_pagos."
    }
  ],
  billeteras: [
    { entidad_codigo: "PERSONAL", nombre: "Binance Pay / USDT (Bolsillo Personal)", moneda: "USDT", tipo_fondo: "OPERATIVO", saldo_origen: 420.00, es_intocable_fiscal: false },
    { entidad_codigo: "PERSONAL", nombre: "Banco Nacional (VES Pago Móvil Personal)", moneda: "VES", tipo_fondo: "OPERATIVO", saldo_origen: 78750.00, es_intocable_fiscal: false },
    { entidad_codigo: "PERSONAL", nombre: "Efectivo USD (Billetera Física Personal)", moneda: "USD_CASH", tipo_fondo: "OPERATIVO", saldo_origen: 110.00, es_intocable_fiscal: false },
    { entidad_codigo: "PERSONAL", nombre: "Fondo de Paz / Emergencia (Reserva Intocable)", moneda: "USDT", tipo_fondo: "FONDO_PAZ_EMERGENCIA", saldo_origen: 1200.00, es_intocable_fiscal: false },
    { entidad_codigo: "PERSONAL", nombre: "Bóveda de Sobres Anuales (HCM, Vehículo, Hogar)", moneda: "USDT", tipo_fondo: "SOBRES_AHORRO", saldo_origen: 485.00, es_intocable_fiscal: false },
    { entidad_codigo: "MAGIA_CON_K", nombre: "Caja Operativa Magia con K (VES -> USDT)", moneda: "USDT", tipo_fondo: "OPERATIVO", saldo_origen: 385.50, es_intocable_fiscal: false },
    { entidad_codigo: "MAGIA_CON_K", nombre: "Fondo Reposición Inventario China (Magia con K)", moneda: "USDT", tipo_fondo: "OPERATIVO", saldo_origen: 598.00, es_intocable_fiscal: false },
    { entidad_codigo: "MAGIA_CON_K", nombre: "Bóveda Fiscal SENIAT & Alcaldía (Magia con K)", moneda: "USDT", tipo_fondo: "BOVEDA_FISCAL", saldo_origen: 142.80, es_intocable_fiscal: true },
    { entidad_codigo: "PAPEL", nombre: "Caja Operativa Cobranzas B2B (Papel)", moneda: "USD_CASH", tipo_fondo: "OPERATIVO", saldo_origen: 312.00, es_intocable_fiscal: false },
    { entidad_codigo: "PAPEL", nombre: "Fondo Importación Marítima (Papel)", moneda: "USDT", tipo_fondo: "OPERATIVO", saldo_origen: 280.00, es_intocable_fiscal: false },
    { entidad_codigo: "PAPEL", nombre: "Bóveda Fiscal IVA / Alcaldía / ISLR (Papel)", moneda: "USDT", tipo_fondo: "BOVEDA_FISCAL", saldo_origen: 118.40, es_intocable_fiscal: true }
  ],
  categorias: [
    { codigo: "PER_VIVIENDA", nombre: "Vivienda, Condominio y Servicios Hogar", bloque: "BLOQUE_A_VITALES", icono: "🏠", moneda_optima: "VES_BCV", presupuesto_mensual_usd: 85.00, gasto_acumulado_mes_usd: 62.00, meta_sobre_total_usd: 0, saldo_sobre_actual_usd: 0, aplica_desgravamen_islr: true, dia_vencimiento: 5, orden: 1, notas: "Pagar Condominio y Corpoelec en VES a tasa BCV ahorra 16% por brecha cambiaria." },
    { codigo: "PER_MERCADO", nombre: "Supermercado, Proteínas y Alimentación Base", bloque: "BLOQUE_A_VITALES", icono: "🛒", moneda_optima: "VES_BCV", presupuesto_mensual_usd: 140.00, gasto_acumulado_mes_usd: 95.00, meta_sobre_total_usd: 0, saldo_sobre_actual_usd: 0, aplica_desgravamen_islr: false, dia_vencimiento: null, orden: 2, notas: "Compras en comercios formales a tasa BCV sin recargo del 3% IGTF." },
    { codigo: "PER_INTERNET", nombre: "Internet Fibra Óptica & Planes Móviles", bloque: "BLOQUE_A_VITALES", icono: "🌐", moneda_optima: "VES_BCV", presupuesto_mensual_usd: 35.00, gasto_acumulado_mes_usd: 35.00, meta_sobre_total_usd: 0, saldo_sobre_actual_usd: 0, aplica_desgravamen_islr: false, dia_vencimiento: 10, orden: 3, notas: "Prorrateado 70% Personal / 30% Operación Remota Emprendimientos." },
    { codigo: "PER_SALUD_BASE", nombre: "Salud Recurrente, Farmacia y Consultas", bloque: "BLOQUE_A_VITALES", icono: "💊", moneda_optima: "VES_BCV", presupuesto_mensual_usd: 35.00, gasto_acumulado_mes_usd: 18.00, meta_sobre_total_usd: 0, saldo_sobre_actual_usd: 0, aplica_desgravamen_islr: true, dia_vencimiento: null, orden: 4, notas: "Exigir siempre Factura Fiscal SENIAT a tu nombre para Desgravamen ISLR (Art. 59)." },
    { codigo: "PER_TRANSPORTE", nombre: "Combustible Personal y Movilidad", bloque: "BLOQUE_A_VITALES", icono: "⛽", moneda_optima: "VES_BCV", presupuesto_mensual_usd: 35.00, gasto_acumulado_mes_usd: 24.00, meta_sobre_total_usd: 0, saldo_sobre_actual_usd: 0, aplica_desgravamen_islr: false, dia_vencimiento: null, orden: 5, notas: "Uso estrictamente personal; despachos de Magia o Papel se cargan a cada negocio." },
    { codigo: "SOBRE_HCM", nombre: "Sobre Póliza HCM & Emergencias Médicas", bloque: "BLOQUE_B_SOBRES", icono: "🏥", moneda_optima: "USD_USDT", presupuesto_mensual_usd: 30.00, gasto_acumulado_mes_usd: 30.00, meta_sobre_total_usd: 480.00, saldo_sobre_actual_usd: 210.00, aplica_desgravamen_islr: true, dia_vencimiento: 15, orden: 6, notas: "Apartado mensual sagrado para prima anual HCM y deducible." },
    { codigo: "SOBRE_VEHICULO", nombre: "Sobre Cauchos, Batería, Aceite y RCV", bloque: "BLOQUE_B_SOBRES", icono: "🚗", moneda_optima: "USD_USDT", presupuesto_mensual_usd: 25.00, gasto_acumulado_mes_usd: 25.00, meta_sobre_total_usd: 350.00, saldo_sobre_actual_usd: 145.00, aplica_desgravamen_islr: false, dia_vencimiento: 20, orden: 7, notas: "Evita descapitalizar el mes o tocar dinero de Magia/Papel cuando toque taller." },
    { codigo: "SOBRE_HOGAR_REP", nombre: "Sobre Reparaciones Hogar & Línea Blanca", bloque: "BLOQUE_B_SOBRES", icono: "🛠️", moneda_optima: "USD_USDT", presupuesto_mensual_usd: 15.00, gasto_acumulado_mes_usd: 15.00, meta_sobre_total_usd: 250.00, saldo_sobre_actual_usd: 80.00, aplica_desgravamen_islr: false, dia_vencimiento: null, orden: 8, notas: "Mantenimiento de aires acondicionados y equipos domésticos." },
    { codigo: "SOBRE_ISLR_DOC", nombre: "Sobre ISLR Personal, Pasaporte y Trámites", bloque: "BLOQUE_B_SOBRES", icono: "📑", moneda_optima: "VES_BCV", presupuesto_mensual_usd: 10.00, gasto_acumulado_mes_usd: 10.00, meta_sobre_total_usd: 120.00, saldo_sobre_actual_usd: 30.00, aplica_desgravamen_islr: false, dia_vencimiento: 31, orden: 9, notas: "Provisión para cierre fiscal Persona Natural antes del 31 de marzo." },
    { codigo: "SOBRE_ANUALIDADES", nombre: "Sobre Vacaciones, Navidad y Regalos Familia", bloque: "BLOQUE_B_SOBRES", icono: "🎁", moneda_optima: "USD_USDT", presupuesto_mensual_usd: 10.00, gasto_acumulado_mes_usd: 10.00, meta_sobre_total_usd: 200.00, saldo_sobre_actual_usd: 20.00, aplica_desgravamen_islr: false, dia_vencimiento: null, orden: 10, notas: "Fechas especiales planificadas sin endeudamiento." },
    { codigo: "PER_RESTAURANTES", nombre: "Salidas, Restaurantes y Cafés", bloque: "BLOQUE_C_ESTILO_VIDA", icono: "🍔", moneda_optima: "MIXTA", presupuesto_mensual_usd: 40.00, gasto_acumulado_mes_usd: 34.50, meta_sobre_total_usd: 0, saldo_sobre_actual_usd: 0, aplica_desgravamen_islr: false, dia_vencimiento: null, orden: 11, notas: "Alerta preventiva al llegar al 80% del tope mensual." },
    { codigo: "PER_SUSCRIPCIONES", nombre: "Suscripciones Digitales y Streaming Personal", bloque: "BLOQUE_C_ESTILO_VIDA", icono: "🎬", moneda_optima: "USD_USDT", presupuesto_mensual_usd: 15.00, gasto_acumulado_mes_usd: 15.00, meta_sobre_total_usd: 0, saldo_sobre_actual_usd: 0, aplica_desgravamen_islr: false, dia_vencimiento: 18, orden: 12, notas: "No mezclar con herramientas SaaS de Magia con K." },
    { codigo: "PER_CUIDADO_ROPA", nombre: "Cuidado Personal, Barbería y Vestimenta", bloque: "BLOQUE_C_ESTILO_VIDA", icono: "👔", moneda_optima: "VES_BCV", presupuesto_mensual_usd: 20.00, gasto_acumulado_mes_usd: 12.00, meta_sobre_total_usd: 0, saldo_sobre_actual_usd: 0, aplica_desgravamen_islr: false, dia_vencimiento: null, orden: 13, notas: "Gasto discrecional controlado." },
    { codigo: "PER_HORMIGA", nombre: "Tope Mensual de Gastos Hormiga (Snacks / Varios)", bloque: "BLOQUE_C_ESTILO_VIDA", icono: "🐜", moneda_optima: "VES_BCV", presupuesto_mensual_usd: 15.00, gasto_acumulado_mes_usd: 11.80, meta_sobre_total_usd: 0, saldo_sobre_actual_usd: 0, aplica_desgravamen_islr: false, dia_vencimiento: null, orden: 14, notas: "Cualquier micro-gasto < $10 sin categoría cae aquí para evitar fugas invisibles." },
    { codigo: "FUT_FONDO_PAZ", nombre: "Fondo de Emergencia Personal (3-6 Meses USDT)", bloque: "BLOQUE_D_FUTURO_DEUDAS", icono: "🛡️", moneda_optima: "USD_USDT", presupuesto_mensual_usd: 55.00, gasto_acumulado_mes_usd: 55.00, meta_sobre_total_usd: 2400.00, saldo_sobre_actual_usd: 1200.00, aplica_desgravamen_islr: false, dia_vencimiento: 1, orden: 15, notas: "Págate a ti primero el día 1 de cada mes al cobrar tu sueldo de fundador." },
    { codigo: "FUT_INVERSION", nombre: "Inversión Patrimonial Independiente", bloque: "BLOQUE_D_FUTURO_DEUDAS", icono: "📈", moneda_optima: "USD_USDT", presupuesto_mensual_usd: 35.00, gasto_acumulado_mes_usd: 35.00, meta_sobre_total_usd: 1500.00, saldo_sobre_actual_usd: 380.00, aplica_desgravamen_islr: false, dia_vencimiento: 5, orden: 16, notas: "Diversificación fuera del inventario de Magia con K y Papel." }
  ],
  obligacionesFiscales: [
    { codigo: "FIS_MAGIA_IVA", entidad_codigo: "MAGIA_CON_K", organismo: "SENIAT", tributo: "IVA Ordinario / Débito vs Crédito Fiscal", frecuencia: "MENSUAL", alicuota_referencia: "16% General", dia_vencimiento_estimado: "Primeros 15 días del mes siguiente", monto_provisionado_usd: 82.50, monto_meta_periodo_usd: 95.00, riesgo_multa_tcmmv: "100 a 150 TCMMV (COT) + Intereses", estado: "PROVISIONANDO", notas: "El IVA cobrado en ventas facturadas se separa en la Bóveda Fiscal y no se toca." },
    { codigo: "FIS_MAGIA_ALCALDIA", entidad_codigo: "MAGIA_CON_K", organismo: "ALCALDIA", tributo: "Impuesto Actividades Económicas (Ingresos Brutos)", frecuencia: "MENSUAL", alicuota_referencia: "1.50% s/ Ingresos Brutos (o Mínimo Tributable)", dia_vencimiento_estimado: "Día 10 al 20 de cada mes (LOCAPTEM)", monto_provisionado_usd: 28.30, monto_meta_periodo_usd: 30.00, riesgo_multa_tcmmv: "Clausura temporal + Multa en TCMMV", estado: "AL_DIA", notas: "Declarar siempre aunque haya meses de baja facturación para cubrir el Mínimo Tributable municipal." },
    { codigo: "FIS_MAGIA_IGTF", entidad_codigo: "MAGIA_CON_K", organismo: "SENIAT", tributo: "IGTF Pagos en Divisas / Cripto (3%)", frecuencia: "QUINCENAL", alicuota_referencia: "3.00% en pagos USD/USDT a SPE", dia_vencimiento_estimado: "Según operación bancaria / percepción", monto_provisionado_usd: 14.00, monto_meta_periodo_usd: 14.00, riesgo_multa_tcmmv: "Multa por omisión de percepción", estado: "AL_DIA", notas: "Priorizar pagos a proveedores nacionales en VES a tasa BCV para ahorrar el 3% de IGTF + 16% brecha." },
    { codigo: "FIS_MAGIA_RNE", entidad_codigo: "MAGIA_CON_K", organismo: "SENIAT / RNE", tributo: "Renovación Registro Nacional de Emprendimientos y LPP", frecuencia: "ANUAL", alicuota_referencia: "Exoneración temporal RNE (Vigencia 2 años)", dia_vencimiento_estimado: "Verificar vencimiento certificado RNE", monto_provisionado_usd: 18.00, monto_meta_periodo_usd: 25.00, riesgo_multa_tcmmv: "Pérdida de exoneración LPP 9% / ISLR", estado: "EXONERADO_RNE", notas: "Mantener ingresos anuales dentro del tope legal RNE o planificar transición a PyME / C.A." },
    { codigo: "FIS_PAPEL_IVA", entidad_codigo: "PAPEL", organismo: "SENIAT", tributo: "IVA Ventas B2B Papel Adhesivo & Fotográfico", frecuencia: "MENSUAL", alicuota_referencia: "16% General (Retenciones 75% SPE)", dia_vencimiento_estimado: "Primeros 15 días del mes", monto_provisionado_usd: 64.20, monto_meta_periodo_usd: 75.00, riesgo_multa_tcmmv: "100 a 150 TCMMV (COT)", estado: "PROVISIONANDO", notas: "Controlar comprobantes de retención de IVA si los clientes B2B son Sujetos Pasivos Especiales." },
    { codigo: "FIS_PAPEL_ALCALDIA", entidad_codigo: "PAPEL", organismo: "ALCALDIA", tributo: "Patente Industria y Comercio (Mayorista Papel)", frecuencia: "MENSUAL", alicuota_referencia: "2.00% Ingresos Brutos Cobrados/Facturados", dia_vencimiento_estimado: "Primeros 15 días del mes", monto_provisionado_usd: 24.20, monto_meta_periodo_usd: 28.00, riesgo_multa_tcmmv: "Recargos moratorios + Multa TCMMV", estado: "AL_DIA", notas: "Apartado automático del 2% por cada cobro registrado en erp_papel_pagos." },
    { codigo: "FIS_PAPEL_ISLR", entidad_codigo: "PAPEL", organismo: "SENIAT", tributo: "Provisión ISLR Ejercicio + Retenciones Decreto 1.808", frecuencia: "MENSUAL", alicuota_referencia: "15% - 34% s/ Utilidad Neta Fiscal", dia_vencimiento_estimado: "Retenciones: primeros 10 días / Anual: Marzo", monto_provisionado_usd: 30.00, monto_meta_periodo_usd: 45.00, riesgo_multa_tcmmv: "100% a 300% del tributo omitido", estado: "PROVISIONANDO", notas: "Exigir factura fiscal en fletes nacionales y aduana para deducir costos legalmente." },
    { codigo: "FIS_PER_ISLR", entidad_codigo: "PERSONAL", organismo: "SENIAT", tributo: "Declaración ISLR Persona Natural + Carpeta Desgravámenes", frecuencia: "ANUAL", alicuota_referencia: "Tarifa N° 1 (774 UT o Desgravámenes Detallados)", dia_vencimiento_estimado: "1 de Enero al 31 de Marzo", monto_provisionado_usd: 30.00, monto_meta_periodo_usd: 60.00, riesgo_multa_tcmmv: "50 a 150 TCMMV por declaración extemporánea", estado: "AL_DIA", notas: "Archivar facturas fiscales de HCM, consultas médicas, odontología y educación a nombre de tu RIF V-." }
  ],
  crucesPatrimoniales: [
    { id: "c1", fecha: "2026-10-12", emprendimiento_codigo: "MAGIA_CON_K", direccion: "SOCIO_PRESTA_A_NEGOCIO", concepto: "Embalaje y guías MRW/Zoom pagadas con Pago Móvil Personal de Gabriel", monto_usd_real: 24.14, moneda_origen: "VES", estado: "PENDIENTE", notas: "Magia con K debe reembolsar $24.14 USDT al bolsillo personal." },
    { id: "c2", fecha: "2026-10-14", emprendimiento_codigo: "PAPEL", direccion: "SOCIO_PRESTA_A_NEGOCIO", concepto: "Flete despacho rollos Papel Adhesivo pagado con efectivo personal", monto_usd_real: 20.00, moneda_origen: "USD_CASH", estado: "PENDIENTE", notas: "Papel debe reembolsar $20.00 USD al bolsillo personal." },
    { id: "c3", fecha: "2026-10-16", emprendimiento_codigo: "PAPEL", direccion: "NEGOCIO_ADELANTA_A_SOCIO", concepto: "Almuerzo personal pagado desde caja chica de Papel (Ya descontado del sobre Restaurantes)", monto_usd_real: 15.00, moneda_origen: "USD_CASH", estado: "PENDIENTE", notas: "Compensar contra el reembolso pendiente de Papel ($20 - $15 = $5 netos a favor del socio)." }
  ],
  transacciones: [
    { fecha: "2026-10-16", entidad_codigo: "PERSONAL", tipo_movimiento: "GASTO_CRUZADO_NEGOCIO_PAGA_SOCIO", categoria_codigo: "PER_RESTAURANTES", concepto: "Almuerzo familiar domingo pagado por emergencia con tarjeta de Caja Papel", moneda_origen: "USD_CASH", monto_origen: 15.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 15.00, monto_usd_real: 15.00, ahorro_cambiario_usd: 0.00, tiene_factura_fiscal: false, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: true, entidad_pagadora_cruce: "PAPEL" },
    { fecha: "2026-10-14", entidad_codigo: "PAPEL", tipo_movimiento: "GASTO_CRUZADO_SOCIO_PAGA_NEGOCIO", categoria_codigo: null, concepto: "Adelanto flete despacho urgente rollos Adhesivo cliente Luisalba (Pagado con Efectivo Personal)", moneda_origen: "USD_CASH", monto_origen: 20.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 20.00, monto_usd_real: 20.00, ahorro_cambiario_usd: 0.00, tiene_factura_fiscal: false, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: true, entidad_pagadora_cruce: "PERSONAL" },
    { fecha: "2026-10-12", entidad_codigo: "MAGIA_CON_K", tipo_movimiento: "GASTO_CRUZADO_SOCIO_PAGA_NEGOCIO", categoria_codigo: null, concepto: "Pago urgente de bolsas de embalaje y cinta para envíos ML (Pagado con Pago Móvil Personal)", moneda_origen: "VES", monto_origen: 24500.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 28.00, monto_usd_real: 24.14, ahorro_cambiario_usd: 3.86, tiene_factura_fiscal: true, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: true, entidad_pagadora_cruce: "PERSONAL" },
    { fecha: "2026-10-10", entidad_codigo: "PERSONAL", tipo_movimiento: "GASTO_PERSONAL", categoria_codigo: "PER_SALUD_BASE", concepto: "Consulta Odontológica + Farmacia con Factura Fiscal SENIAT", moneda_origen: "VES", monto_origen: 15750.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 18.00, monto_usd_real: 15.52, ahorro_cambiario_usd: 2.48, tiene_factura_fiscal: true, aplica_desgravamen_islr: true, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null },
    { fecha: "2026-10-08", entidad_codigo: "PERSONAL", tipo_movimiento: "GASTO_PERSONAL", categoria_codigo: "PER_MERCADO", concepto: "Compra Supermercado Quincena 1 (Facturado en Bs a BCV sin IGTF)", moneda_origen: "VES", monto_origen: 83125.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 95.00, monto_usd_real: 81.90, ahorro_cambiario_usd: 13.10, tiene_factura_fiscal: true, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null },
    { fecha: "2026-10-05", entidad_codigo: "PERSONAL", tipo_movimiento: "GASTO_PERSONAL", categoria_codigo: "PER_VIVIENDA", concepto: "Pago Condominio y Corpoelec en Bs a tasa BCV (Liquidando USDT en P2P)", moneda_origen: "VES", monto_origen: 54250.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 62.00, monto_usd_real: 53.45, ahorro_cambiario_usd: 8.55, tiene_factura_fiscal: true, aplica_desgravamen_islr: true, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null },
    { fecha: "2026-10-03", entidad_codigo: "PERSONAL", tipo_movimiento: "APORTE_SOBRE", categoria_codigo: "FUT_FONDO_PAZ", concepto: "Págate a ti primero: Aporte mensual Fondo de Emergencia USDT", moneda_origen: "USDT", monto_origen: 55.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 55.00, monto_usd_real: 55.00, ahorro_cambiario_usd: 0.00, tiene_factura_fiscal: false, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: null },
    { fecha: "2026-10-02", entidad_codigo: "PERSONAL", tipo_movimiento: "SUELDO_FUNDADOR", categoria_codigo: null, concepto: "Sueldo Fundador Octubre — Transferido desde Papel B2B", moneda_origen: "USD_CASH", monto_origen: 250.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 250.00, monto_usd_real: 250.00, ahorro_cambiario_usd: 0.00, tiene_factura_fiscal: false, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: "PAPEL" },
    { fecha: "2026-10-01", entidad_codigo: "PERSONAL", tipo_movimiento: "SUELDO_FUNDADOR", categoria_codigo: null, concepto: "Sueldo Fundador Octubre — Transferido desde Magia con K", moneda_origen: "USDT", monto_origen: 350.00, tasa_bcv: 875.00, tasa_binance: 1015.00, monto_usd_bcv: 350.00, monto_usd_real: 350.00, ahorro_cambiario_usd: 0.00, tiene_factura_fiscal: false, aplica_desgravamen_islr: false, es_gasto_hormiga: false, es_bolsillo_cruzado: false, entidad_pagadora_cruce: "MAGIA_CON_K" }
  ],
  gmailFacturas: [
    { gmail_message_id: "gmail-farmatodo-salud-oct-2026", fecha_correo: "2026-10-17", remitente: "facturacion.electronica@farmatodo.com", asunto: "Factura Electrónica Farmatodo #FTD-552190 - Medicamentos", rif_detectado: "J-00020200-1", numero_factura: "FTD-552190", entidad_asignada: "PERSONAL", categoria_asignada: "PER_SALUD_BASE", moneda_detectada: "VES", monto_origen: 12250.00, monto_usd_bcv: 14.00, monto_usd_real: 12.07, tiene_factura_fiscal: true, aplica_desgravamen_islr: true },
    { gmail_message_id: "gmail-ml-comision-oct-2026", fecha_correo: "2026-10-15", remitente: "no-reply@mercadolibre.com.ve", asunto: "Factura mensual de cargos por venta Mercado Libre Venezuela", rif_detectado: "J-30684267-5", numero_factura: "MLV-0094821", entidad_asignada: "MAGIA_CON_K", categoria_asignada: "", moneda_detectada: "VES", monto_origen: 38325.00, monto_usd_bcv: 43.80, monto_usd_real: 37.76, tiene_factura_fiscal: true, aplica_desgravamen_islr: false },
    { gmail_message_id: "gmail-fibex-oct-2026", fecha_correo: "2026-10-10", remitente: "facturacion@fibextelecom.net", asunto: "Factura Fiscal SENIAT #FBX-88412 - Servicio Fibra Óptica Octubre", rif_detectado: "J-40123987-1", numero_factura: "FBX-88412", entidad_asignada: "PERSONAL", categoria_asignada: "PER_INTERNET", moneda_detectada: "VES", monto_origen: 30625.00, monto_usd_bcv: 35.00, monto_usd_real: 30.17, tiene_factura_fiscal: true, aplica_desgravamen_islr: false }
  ]
};
