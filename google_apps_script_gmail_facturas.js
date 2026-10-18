/**
 * ==============================================================================
 * EXTRACTOR AUTOMÁTICO DE FACTURAS Y GASTOS DESDE GMAIL A SUPABASE CLOUD
 * Proyecto: Gestión de Presupuesto Personal + Magia con K + Papel (Venezuela)
 * Cuenta Google: galvarezuc@gmail.com
 * ==============================================================================
 *
 * ¿QUÉ HACE ESTE SCRIPT?
 * 1. Escanea automáticamente tu bandeja de Gmail buscando facturas, recibos,
 *    comprobantes de Pago Móvil, transferencias (Banesco, Mercantil, Provincial, BDV),
 *    Binance Pay, Zelle, Mercado Libre, fletes (MRW, Zoom, Tealca), servicios (Fibex,
 *    Netuno, Corpoelec, Condominio) y salud/HCM (Farmatodo, Locatel, Seguros).
 * 2. Extrae automáticamente:
 *    - Fecha, Remitente y Asunto
 *    - RIF (J-, V-, G-) y Número de Factura / Control Fiscal SENIAT
 *    - Moneda (VES / USD / USDT) y Monto Total + IVA (16%) + IGTF (3%)
 *    - Clasifica inteligentemente si el gasto pertenece a:
 *      • PERSONAL (y asigna la categoría: Supermercado, Salud, Vivienda, Internet, etc.)
 *      • MAGIA_CON_K (Mercado Libre, embalaje, envíos de mazos/tarot, proveedores China)
 *      • PAPEL (Fletes de rollos, aduana, papel adhesivo/fotográfico)
 *    - Detecta si aplica para Desgravamen de ISLR Persona Natural (Art. 59: Salud, HCM, Educación, Vivienda).
 * 3. Envía las facturas directamente a tu Supabase Cloud (`rpc_ingerir_facturas_gmail`),
 *    anotando el gasto en `fin_transacciones` y descontándolo de tu presupuesto mensual
 *    sin duplicar jamás un correo (controlado por `gmail_message_id`).
 *
 * CÓMO ACTIVARLO EN 1 MINUTO (Funciona 24/7 aunque tu PC esté apagada):
 * 1. Entra en https://script.google.com con tu correo (galvarezuc@gmail.com).
 * 2. Haz clic en "Nuevo proyecto", borra el contenido y pega TODO este archivo.
 * 3. Presiona Guardar (Ctrl+S) y ejecuta la función `instalarExtractorAutomaticoGmail`.
 * 4. Autoriza los permisos de lectura de Gmail y conexión a Supabase.
 * 5. (Opcional) Si quieres dispararlo desde un botón de la Web App, haz clic en
 *    "Implementar > Nueva implementación > Aplicación web" (Ejecutar como: Yo, Acceso: Cualquier persona)
 *    y pega la URL generada en el botón "Conectar Gmail" de tu Dashboard de Presupuesto.
 * ==============================================================================
 */

const GMAIL_SUPABASE_CONFIG = {
  SUPABASE_URL: "https://pobekklqgevauexuhrnu.supabase.co",
  SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYmVra2xxZ2V2YXVleHVocm51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMDk2MjcsImV4cCI6MjEwNzY4NTYyN30.PQAtBljmv06PiSUrEZuroMYke97StreEf0720IBBJlI",
  RPC_INGEST: "rpc_ingerir_facturas_gmail",
  DIAS_BUSQUEDA: 30,
  MAX_HILOS: 40
};

/**
 * 1. FUNCIÓN PRINCIPAL: ESCANEAR GMAIL Y ANOTAR GASTOS EN SUPABASE
 */
function escanearGmailYAnotarGastos() {
  const query = 'newer_than:' + GMAIL_SUPABASE_CONFIG.DIAS_BUSQUEDA + 'd (' +
    'subject:(factura OR recibo OR comprobante OR "pago movil" OR transferencia OR orden OR cobro OR invoice OR receipt OR seniat) ' +
    'OR "factura fiscal" OR "monto pagado" OR "total a pagar" OR "banesco" OR "mercantil" OR "binance" OR "mercadolibre" OR "farmatodo" OR "fibex" OR "corpoelec" OR "condominio" OR "mrw" OR "zoom"' +
    ')';

  const threads = GmailApp.search(query, 0, GMAIL_SUPABASE_CONFIG.MAX_HILOS);
  const facturasDetectadas = [];

  for (let t = 0; t < threads.length; t++) {
    const messages = threads[t].getMessages();
    for (let m = 0; m < messages.length; m++) {
      const msg = messages[m];
      const msgId = msg.getId();
      const fecha = Utilities.formatDate(msg.getDate(), Session.getScriptTimeZone() || "America/Caracas", "yyyy-MM-dd");
      const remitente = msg.getFrom() || "Correo Gmail";
      const asunto = msg.getSubject() || "Comprobante por Correo";
      const cuerpoPlano = (msg.getPlainBody() || "").substring(0, 4500);

      const analisis = analizarTextoFacturaVenezolana(asunto, remitente, cuerpoPlano);

      if (analisis && analisis.monto_origen > 0) {
        facturasDetectadas.push({
          gmail_message_id: msgId,
          fecha_correo: fecha,
          remitente: remitente,
          asunto: asunto,
          rif_detectado: analisis.rif_detectado,
          numero_factura: analisis.numero_factura,
          entidad_asignada: analisis.entidad_asignada,
          categoria_asignada: analisis.categoria_asignada,
          moneda_detectada: analisis.moneda_detectada,
          monto_origen: analisis.monto_origen,
          iva_origen: analisis.iva_origen,
          igtf_origen: analisis.igtf_origen,
          tiene_factura_fiscal: analisis.tiene_factura_fiscal,
          aplica_desgravamen_islr: analisis.aplica_desgravamen_islr,
          fragmento_texto: analisis.fragmento_texto
        });
      }
    }
  }

  if (facturasDetectadas.length === 0) {
    const resVacio = { success: true, facturas_nuevas_anotadas: 0, facturas_duplicadas_omitidas: 0, mensaje: "No se encontraron facturas nuevas en los últimos días." };
    Logger.log(JSON.stringify(resVacio));
    return resVacio;
  }

  const resultadoSupabase = enviarFacturasASupabaseRPC(facturasDetectadas);
  Logger.log("Resultado ingesta Gmail -> Supabase: " + JSON.stringify(resultadoSupabase));
  return resultadoSupabase;
}

/**
 * 2. MOTOR DE INTELIGENCIA FISCAL Y CLASIFICACIÓN DE GASTOS (VENEZUELA)
 */
function analizarTextoFacturaVenezolana(asunto, remitente, cuerpo) {
  const textoCompleto = (asunto + " \n " + remitente + " \n " + cuerpo);
  const textoLower = textoCompleto.toLowerCase();

  // Ignorar correos publicitarios o de seguridad sin montos reales
  if (textoLower.includes("código de verificación") || textoLower.includes("alerta de inicio de sesión") || textoLower.includes("newsletter")) {
    return null;
  }

  // A. Extraer RIF Venezolano (J-12345678-9, G-..., V-...)
  const rifMatch = textoCompleto.match(/\b([JVGjvg]\s*[-–]?\s*\d{7,9}\s*[-–]?\s*\d?)\b/);
  const rifDetectado = rifMatch ? rifMatch[1].toUpperCase().replace(/\s+/g, "") : "";

  // B. Extraer Número de Factura / Recibo / Referencia
  const facMatch = textoCompleto.match(/(?:factura|control|recibo|referencia|nro|n°|#)\s*[:#\-]?\s*([A-Z0-9\-]{4,20})/i);
  const numeroFactura = facMatch ? facMatch[1].toUpperCase() : "";

  // C. Detectar Moneda y Monto Principal
  let moneda = "VES";
  let monto = 0;

  // Buscar primero patrones explícitos en Bolívares (Bs. 1.250,50 o VES 1250.50)
  const bsMatch = textoCompleto.match(/(?:bs\.?|ves|bol[ií]vares)\s*[:$]?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})|[0-9]+(?:[.,][0-9]{2}))/i);
  // Buscar patrones en USDT / USD ($ 45.00, USD 45.00, 45.00 USDT)
  const usdMatch = textoCompleto.match(/(?:usdt|usd|us\$|\$)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})|[0-9]+(?:[.,][0-9]{2}))|([0-9]+(?:[.,][0-9]{2}))\s*(?:usdt|usd)/i);

  if (bsMatch && bsMatch[1]) {
    moneda = "VES";
    monto = normalizarMonto(bsMatch[1]);
  } else if (usdMatch) {
    const rawUsd = usdMatch[1] || usdMatch[2];
    moneda = textoLower.includes("usdt") || textoLower.includes("binance") ? "USDT" : "USD_CASH";
    monto = normalizarMonto(rawUsd);
  }

  if (!monto || monto <= 0) return null;

  // D. Detectar IVA (16%) e IGTF (3%) si están desglosados
  const ivaMatch = textoCompleto.match(/iva\s*(?:\(16%\))?\s*[:$]?\s*(?:bs\.?|usd|\$)?\s*([0-9.,]+)/i);
  const igtfMatch = textoCompleto.match(/igtf\s*(?:\(3%\))?\s*[:$]?\s*(?:bs\.?|usd|\$)?\s*([0-9.,]+)/i);
  const ivaOrigen = ivaMatch ? normalizarMonto(ivaMatch[1]) : 0;
  const igtfOrigen = igtfMatch ? normalizarMonto(igtfMatch[1]) : 0;

  // E. Clasificación Automática de Entidad (PERSONAL vs MAGIA_CON_K vs PAPEL) y Categoría
  let entidad = "PERSONAL";
  let categoria = "PER_MERCADO";
  let aplicaDesgravamen = false;
  let tieneFacturaFiscal = Boolean(rifDetectado) || textoLower.includes("seniat") || textoLower.includes("factura") || textoLower.includes("iva");

  if (
    textoLower.includes("mercadolibre") ||
    textoLower.includes("mercado libre") ||
    textoLower.includes("mazo") ||
    textoLower.includes("tarot") ||
    textoLower.includes("magia") ||
    textoLower.includes("comisión por venta")
  ) {
    entidad = "MAGIA_CON_K";
    categoria = "";
  } else if (
    textoLower.includes("papel adhesivo") ||
    textoLower.includes("fotográfico") ||
    textoLower.includes("resma") ||
    textoLower.includes("rollo") ||
    textoLower.includes("luisalba") ||
    textoLower.includes("naviera")
  ) {
    entidad = "PAPEL";
    categoria = "";
  } else if (
    textoLower.includes("clínica") ||
    textoLower.includes("clinica") ||
    textoLower.includes("hospital") ||
    textoLower.includes("odont") ||
    textoLower.includes("laboratorio") ||
    textoLower.includes("farmatodo") ||
    textoLower.includes("locatel") ||
    textoLower.includes("farmacia") ||
    textoLower.includes("médico") ||
    textoLower.includes("medico")
  ) {
    entidad = "PERSONAL";
    categoria = "PER_SALUD_BASE";
    aplicaDesgravamen = true;
  } else if (
    textoLower.includes("seguro") ||
    textoLower.includes("póliza") ||
    textoLower.includes("poliza") ||
    textoLower.includes("hcm") ||
    textoLower.includes("mercantil seguros") ||
    textoLower.includes("mapfre") ||
    textoLower.includes("caracas")
  ) {
    entidad = "PERSONAL";
    categoria = "SOBRE_HCM";
    aplicaDesgravamen = true;
  } else if (
    textoLower.includes("fibex") ||
    textoLower.includes("netuno") ||
    textoLower.includes("inter") ||
    textoLower.includes("cantv") ||
    textoLower.includes("digitel") ||
    textoLower.includes("movistar") ||
    textoLower.includes("internet")
  ) {
    entidad = "PERSONAL";
    categoria = "PER_INTERNET";
  } else if (
    textoLower.includes("condominio") ||
    textoLower.includes("corpoelec") ||
    textoLower.includes("hidro") ||
    textoLower.includes("alquiler") ||
    textoLower.includes("electricidad")
  ) {
    entidad = "PERSONAL";
    categoria = "PER_VIVIENDA";
    aplicaDesgravamen = true;
  } else if (
    textoLower.includes("netflix") ||
    textoLower.includes("spotify") ||
    textoLower.includes("youtube") ||
    textoLower.includes("apple") ||
    textoLower.includes("google play") ||
    textoLower.includes("disney")
  ) {
    entidad = "PERSONAL";
    categoria = "PER_SUSCRIPCIONES";
  } else if (
    textoLower.includes("pedidosya") ||
    textoLower.includes("yummy") ||
    textoLower.includes("restaurante") ||
    textoLower.includes("café") ||
    textoLower.includes("pizza") ||
    textoLower.includes("burger")
  ) {
    entidad = "PERSONAL";
    categoria = "PER_RESTAURANTES";
  } else if (
    textoLower.includes("caucho") ||
    textoLower.includes("batería") ||
    textoLower.includes("taller") ||
    textoLower.includes("repuesto") ||
    textoLower.includes("aceite")
  ) {
    entidad = "PERSONAL";
    categoria = "SOBRE_VEHICULO";
  } else if (
    textoLower.includes("gasolina") ||
    textoLower.includes("combustible") ||
    textoLower.includes("ridery")
  ) {
    entidad = "PERSONAL";
    categoria = "PER_TRANSPORTE";
  }

  return {
    rif_detectado: rifDetectado,
    numero_factura: numeroFactura,
    entidad_asignada: entidad,
    categoria_asignada: categoria,
    moneda_detectada: moneda,
    monto_origen: monto,
    iva_origen: ivaOrigen,
    igtf_origen: igtfOrigen,
    tiene_factura_fiscal: tieneFacturaFiscal,
    aplica_desgravamen_islr: aplicaDesgravamen,
    fragmento_texto: cuerpo.substring(0, 280).replace(/\s+/g, " ").trim()
  };
}

function normalizarMonto(str) {
  if (!str) return 0;
  let s = String(str).trim();
  // Si tiene punto de miles y coma decimal (ej. 1.250,50)
  if (s.includes(".") && s.includes(",")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    // Si solo tiene coma (ej. 450,50)
    const parts = s.split(",");
    if (parts[parts.length - 1].length === 2) {
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * 3. ENVÍO A SUPABASE VÍA RPC `rpc_ingerir_facturas_gmail`
 */
function enviarFacturasASupabaseRPC(facturasArray) {
  const url = `${GMAIL_SUPABASE_CONFIG.SUPABASE_URL}/rest/v1/rpc/${GMAIL_SUPABASE_CONFIG.RPC_INGEST}`;
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "apikey": GMAIL_SUPABASE_CONFIG.SUPABASE_KEY,
      "Authorization": `Bearer ${GMAIL_SUPABASE_CONFIG.SUPABASE_KEY}`
    },
    payload: JSON.stringify({ p_facturas: facturasArray }),
    muteHttpExceptions: true
  };

  const res = UrlFetchApp.fetch(url, options);
  const code = res.getResponseCode();
  const text = res.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error(`Error Supabase RPC (${code}): ${text}`);
  }

  return JSON.parse(text);
}

/**
 * 4. ENDPOINT WEBHOOK (Permite disparar la lectura de Gmail desde el botón del Dashboard Web)
 */
function doGet(e) {
  try {
    const res = escanearGmailYAnotarGastos();
    return ContentService
      .createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 5. INSTALADOR DE TRIGGER AUTOMÁTICO CADA HORA (24/7)
 */
function instalarExtractorAutomaticoGmail() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "escanearGmailYAnotarGastos") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger("escanearGmailYAnotarGastos")
    .timeBased()
    .everyHours(1)
    .create();

  // Ejecutar una primera vez de inmediato
  return escanearGmailYAnotarGastos();
}
