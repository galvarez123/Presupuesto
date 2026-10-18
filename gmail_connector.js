// ==============================================================================
// CONECTOR GMAIL & ESCÁNER INTELIGENTE DE FACTURAS Y COMPROBANTES (WEB CLIENT)
// Permite:
// 1. Conectar directo con Gmail API (OAuth Token) o con el Webhook de Google Apps Script
// 2. Analizar cualquier correo, factura SENIAT o notificación bancaria pegada y anotar el gasto
// 3. Auditar las facturas extraídas de Gmail en la tabla `fin_gmail_facturas_bandeja`
// ==============================================================================

(function () {
  "use strict";

  function getClient() {
    return window.supabaseClient || (window.supabase && window.SUPABASE_CONFIG ?
      window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey) : null);
  }

  // Motor local de extracción de facturas venezolanas (mismo algoritmo que el Apps Script)
  function analizarCorreoFacturaLocal(asunto, remitente, cuerpo, fechaCorreo) {
    const textoCompleto = `${asunto || ""} \n ${remitente || ""} \n ${cuerpo || ""}`;
    const textoLower = textoCompleto.toLowerCase();

    const rifMatch = textoCompleto.match(/\b([JVGjvg]\s*[-–]?\s*\d{7,9}\s*[-–]?\s*\d?)\b/);
    const rifDetectado = rifMatch ? rifMatch[1].toUpperCase().replace(/\s+/g, "") : "";

    const facMatch = textoCompleto.match(/(?:factura|control|recibo|referencia|nro|n°|#)\s*[:#\-]?\s*([A-Z0-9\-]{4,20})/i);
    const numeroFactura = facMatch ? facMatch[1].toUpperCase() : ("FAC-" + Math.floor(1000 + Math.random() * 9000));

    let moneda = "VES";
    let monto = 0;

    const bsMatch = textoCompleto.match(/(?:bs\.?|ves|bol[ií]vares)\s*[:$]?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})|[0-9]+(?:[.,][0-9]{2})|[0-9]+)/i);
    const usdMatch = textoCompleto.match(/(?:usdt|usd|us\$|\$)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})|[0-9]+(?:[.,][0-9]{2})|[0-9]+)|([0-9]+(?:[.,][0-9]{2}))\s*(?:usdt|usd)/i);

    if (bsMatch && bsMatch[1]) {
      moneda = "VES";
      monto = parseMontoLocal(bsMatch[1]);
    } else if (usdMatch) {
      const rawUsd = usdMatch[1] || usdMatch[2];
      moneda = textoLower.includes("usdt") || textoLower.includes("binance") ? "USDT" : "USD_CASH";
      monto = parseMontoLocal(rawUsd);
    }

    const ivaMatch = textoCompleto.match(/iva\s*(?:\(16%\))?\s*[:$]?\s*(?:bs\.?|usd|\$)?\s*([0-9.,]+)/i);
    const igtfMatch = textoCompleto.match(/igtf\s*(?:\(3%\))?\s*[:$]?\s*(?:bs\.?|usd|\$)?\s*([0-9.,]+)/i);
    const ivaOrigen = ivaMatch ? parseMontoLocal(ivaMatch[1]) : 0;
    const igtfOrigen = igtfMatch ? parseMontoLocal(igtfMatch[1]) : 0;

    let entidad = "PERSONAL";
    let categoria = "PER_MERCADO";
    let aplicaDesgravamen = false;
    const tieneFacturaFiscal = Boolean(rifDetectado) || textoLower.includes("seniat") || textoLower.includes("factura") || textoLower.includes("iva");

    if (textoLower.includes("mercadolibre") || textoLower.includes("mercado libre") || textoLower.includes("mazo") || textoLower.includes("tarot") || textoLower.includes("magia")) {
      entidad = "MAGIA_CON_K";
      categoria = "";
    } else if (textoLower.includes("papel") || textoLower.includes("adhesivo") || textoLower.includes("fotográfico") || textoLower.includes("rollo") || textoLower.includes("luisalba")) {
      entidad = "PAPEL";
      categoria = "";
    } else if (textoLower.includes("clínica") || textoLower.includes("clinica") || textoLower.includes("odont") || textoLower.includes("farmatodo") || textoLower.includes("locatel") || textoLower.includes("farmacia") || textoLower.includes("laboratorio")) {
      entidad = "PERSONAL";
      categoria = "PER_SALUD_BASE";
      aplicaDesgravamen = true;
    } else if (textoLower.includes("seguro") || textoLower.includes("póliza") || textoLower.includes("poliza") || textoLower.includes("hcm")) {
      entidad = "PERSONAL";
      categoria = "SOBRE_HCM";
      aplicaDesgravamen = true;
    } else if (textoLower.includes("fibex") || textoLower.includes("netuno") || textoLower.includes("inter") || textoLower.includes("digitel") || textoLower.includes("movistar") || textoLower.includes("internet")) {
      entidad = "PERSONAL";
      categoria = "PER_INTERNET";
    } else if (textoLower.includes("condominio") || textoLower.includes("corpoelec") || textoLower.includes("hidro") || textoLower.includes("electricidad")) {
      entidad = "PERSONAL";
      categoria = "PER_VIVIENDA";
      aplicaDesgravamen = true;
    } else if (textoLower.includes("netflix") || textoLower.includes("spotify") || textoLower.includes("youtube") || textoLower.includes("streaming")) {
      entidad = "PERSONAL";
      categoria = "PER_SUSCRIPCIONES";
    } else if (textoLower.includes("pedidosya") || textoLower.includes("yummy") || textoLower.includes("restaurante") || textoLower.includes("pizza") || textoLower.includes("café")) {
      entidad = "PERSONAL";
      categoria = "PER_RESTAURANTES";
    } else if (textoLower.includes("caucho") || textoLower.includes("batería") || textoLower.includes("taller") || textoLower.includes("aceite")) {
      entidad = "PERSONAL";
      categoria = "SOBRE_VEHICULO";
    }

    return {
      gmail_message_id: "gmail-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      fecha_correo: fechaCorreo || new Date().toISOString().split("T")[0],
      remitente: remitente || "Notificación Gmail",
      asunto: asunto || "Factura extraída de Gmail",
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
      fragmento_texto: (cuerpo || "").substring(0, 240).replace(/\s+/g, " ").trim()
    };
  }

  function parseMontoLocal(str) {
    if (!str) return 0;
    let s = String(str).trim();
    if (s.includes(".") && s.includes(",")) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else if (s.includes(",")) {
      const parts = s.split(",");
      if (parts[parts.length - 1].length === 2) s = s.replace(",", ".");
      else s = s.replace(/,/g, "");
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  // Cargar Bandeja de Facturas extraídas de Gmail desde Supabase
  async function cargarBandejaGmailSupabase() {
    const client = getClient();
    if (!client) return;
    try {
      const { data, error } = await client
        .from("fin_gmail_facturas_bandeja")
        .select("*")
        .order("fecha_correo", { ascending: false })
        .limit(40);
      if (!error && data) {
        window.FINANZAS_STATE.gmailFacturas = data;
        renderTablaGmailFacturas();
      }
    } catch (e) {
      console.error("Error cargando bandeja Gmail:", e);
    }
  }

  // Escanear Gmail en vivo usando OAuth Access Token de Google o Webhook de Google Apps Script
  async function sincronizarGmailEnVivo() {
    const tokenInput = document.getElementById("gmail-oauth-token")?.value.trim();
    const webhookUrl = document.getElementById("gmail-gas-webhook")?.value.trim() || localStorage.getItem("PRESUPUESTO_GMAIL_WEBHOOK") || "";
    const statusBox = document.getElementById("gmail-sync-status");

    if (webhookUrl) {
      localStorage.setItem("PRESUPUESTO_GMAIL_WEBHOOK", webhookUrl);
    }

    // Opción 1: Si proporcionó Token OAuth de Gmail API, consultar directamente la API REST de Gmail
    if (tokenInput) {
      if (statusBox) statusBox.innerHTML = `<span style="color:#38bdf8;">⏳ Conectando con Gmail API (galvarezuc@gmail.com) y buscando facturas...</span>`;
      try {
        const q = encodeURIComponent('newer_than:30d (factura OR recibo OR comprobante OR "pago movil" OR banesco OR mercantil OR binance OR mercadolibre OR fibex OR farmatodo OR seniat)');
        const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=15`, {
          headers: { Authorization: `Bearer ${tokenInput}` }
        });
        if (!listRes.ok) throw new Error("Token de acceso expirado o inválido (HTTP " + listRes.status + ")");
        const listJson = await listRes.json();
        const messages = listJson.messages || [];

        const loteFacturas = [];
        for (const m of messages) {
          const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`, {
            headers: { Authorization: `Bearer ${tokenInput}` }
          });
          if (!msgRes.ok) continue;
          const msgData = await msgRes.json();
          const headers = msgData.payload?.headers || [];
          const subject = headers.find(h => h.name.toLowerCase() === "subject")?.value || "Factura Gmail";
          const from = headers.find(h => h.name.toLowerCase() === "from")?.value || "Remitente Gmail";
          const dateHeader = headers.find(h => h.name.toLowerCase() === "date")?.value;
          const fechaIso = dateHeader ? new Date(dateHeader).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
          const snippet = msgData.snippet || "";

          const parsed = analizarCorreoFacturaLocal(subject, from, snippet, fechaIso);
          if (parsed && parsed.monto_origen > 0) {
            parsed.gmail_message_id = m.id;
            loteFacturas.push(parsed);
          }
        }

        await enviarLoteFacturasRpc(loteFacturas, statusBox);
        return;
      } catch (err) {
        if (statusBox) statusBox.innerHTML = `<span style="color:#f87171;">⚠️ Error Gmail API: ${err.message}</span>`;
        return;
      }
    }

    // Opción 2: Si configuró la URL del Google Apps Script desplegado en su cuenta
    if (webhookUrl) {
      if (statusBox) statusBox.innerHTML = `<span style="color:#38bdf8;">⏳ Ejecutando Extractor Gmail en tu cuenta de Google Apps Script...</span>`;
      try {
        const res = await fetch(webhookUrl);
        const data = await res.json();
        if (statusBox) {
          statusBox.innerHTML = `<span style="color:#34d399;">✅ Escaneo Gmail completado: <strong>${data.facturas_nuevas_anotadas || 0} facturas nuevas anotadas</strong> (${data.facturas_duplicadas_omitidas || 0} ya registradas previamente).</span>`;
        }
        await cargarBandejaGmailSupabase();
        if (typeof window.sincronizarTunelSupabase === "function") {
          window.sincronizarTunelSupabase(true);
        }
        return;
      } catch (err) {
        if (statusBox) statusBox.innerHTML = `<span style="color:#f87171;">⚠️ No se pudo contactar el Webhook: ${err.message}</span>`;
        return;
      }
    }

    if (statusBox) {
      statusBox.innerHTML = `<span style="color:#fbbf24;">💡 Pega abajo el texto de cualquier factura/correo para anotarlo al instante, o activa el script <code>google_apps_script_gmail_facturas.js</code> en tu cuenta para lectura automática 24/7.</span>`;
    }
  }

  async function enviarLoteFacturasRpc(loteFacturas, statusBox) {
    const client = getClient();
    if (!client || loteFacturas.length === 0) {
      if (statusBox) statusBox.innerHTML = `<span style="color:#fbbf24;">No se detectaron facturas con monto válido en el lote.</span>`;
      return;
    }

    const { data, error } = await client.rpc("rpc_ingerir_facturas_gmail", {
      p_facturas: loteFacturas
    });
    if (error) throw error;

    if (statusBox) {
      statusBox.innerHTML = `<span style="color:#34d399;">✅ ¡Éxito! Se anotaron <strong>${data.facturas_nuevas_anotadas} facturas en tus gastos</strong> y se omitieron ${data.facturas_duplicadas_omitidas} duplicadas.</span>`;
    }
    if (typeof window.showToast === "function") {
      window.showToast(`📧 <strong>Gmail Sync:</strong> ${data.facturas_nuevas_anotadas} facturas anotadas en tus gastos automáticamente.`, true);
    }
    await cargarBandejaGmailSupabase();
    if (typeof window.sincronizarTunelSupabase === "function") {
      window.sincronizarTunelSupabase(false);
    }
  }

  // Procesar un correo o factura pegado manualmente en el Analizador Inteligente de Gmail
  async function procesarCorreoPegadoEnVivo(e) {
    if (e) e.preventDefault();
    const remitente = document.getElementById("paste-gmail-from")?.value.trim() || "Facturación Electrónica Gmail";
    const asunto = document.getElementById("paste-gmail-subject")?.value.trim() || "Factura Digital / Comprobante";
    const cuerpo = document.getElementById("paste-gmail-body")?.value.trim() || "";
    const statusBox = document.getElementById("gmail-sync-status");

    if (!cuerpo) {
      if (typeof window.showToast === "function") window.showToast("⚠️ Pega el contenido del correo o factura para extraer los datos.", false);
      return;
    }

    const facturaExtraida = analizarCorreoFacturaLocal(asunto, remitente, cuerpo);
    if (!facturaExtraida || facturaExtraida.monto_origen <= 0) {
      if (typeof window.showToast === "function") {
        window.showToast("⚠️ No se detectó un monto en Bs., USD o USDT. Asegúrate de que el texto incluya el monto (ej: Bs. 14.500,00 o $25.00).", false);
      }
      return;
    }

    await enviarLoteFacturasRpc([facturaExtraida], statusBox);
    document.getElementById("paste-gmail-body").value = "";
  }

  function renderTablaGmailFacturas() {
    const tbody = document.getElementById("tbody-gmail-facturas");
    if (!tbody) return;
    const lista = window.FINANZAS_STATE.gmailFacturas || [];

    if (lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:20px;">Aún no hay facturas en la bandeja. Usa el analizador superior o ejecuta la sincronización con Gmail.</td></tr>`;
      return;
    }

    tbody.innerHTML = lista.map(f => {
      const badgeEnt = f.entidad_asignada === "PERSONAL"
        ? `<span class="pill-tag pill-green">👤 Personal (${f.categoria_asignada || "General"})</span>`
        : f.entidad_asignada === "MAGIA_CON_K"
          ? `<span class="pill-tag pill-purple">🔮 Magia con K</span>`
          : `<span class="pill-tag pill-blue">📄 Papel B2B</span>`;

      const montoStr = f.moneda_detectada === "VES"
        ? `Bs ${Number(f.monto_origen).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`
        : `$${Number(f.monto_origen).toFixed(2)} (${f.moneda_detectada})`;

      return `
        <tr>
          <td>${f.fecha_correo}</td>
          <td>
            <strong style="color:#f8fafc;">${f.asunto}</strong>
            <div style="font-size:11px; color:#94a3b8;">De: ${f.remitente}</div>
          </td>
          <td>
            <span class="pill-tag" style="background:rgba(255,255,255,0.06);">${f.rif_detectado || "S/RIF"}</span>
            <div style="font-size:11px; color:#94a3b8; margin-top:2px;">#${f.numero_factura || "S/N"}</div>
          </td>
          <td>${badgeEnt}</td>
          <td style="font-weight:700;">${montoStr}</td>
          <td style="font-weight:800; color:#38bdf8;">$${Number(f.monto_usd_bcv).toFixed(2)} BCV</td>
          <td style="font-weight:800; color:#34d399;">$${Number(f.monto_usd_real).toFixed(2)} USDT</td>
          <td>
            <span class="pill-tag pill-green">✅ Anotado en Gastos</span>
            ${f.aplica_desgravamen_islr ? `<span class="pill-tag pill-purple" style="margin-top:4px;">🏥 Desgravamen ISLR</span>` : ""}
          </td>
        </tr>
      `;
    }).join("");
  }

  window.sincronizarGmailEnVivo = sincronizarGmailEnVivo;
  window.procesarCorreoPegadoEnVivo = procesarCorreoPegadoEnVivo;
  window.cargarBandejaGmailSupabase = cargarBandejaGmailSupabase;
  window.renderTablaGmailFacturas = renderTablaGmailFacturas;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(cargarBandejaGmailSupabase, 450));
  } else {
    setTimeout(cargarBandejaGmailSupabase, 450);
  }
})();
