// ==============================================================================
// MOTOR MÓVIL: CÁMARA OCR DE FACTURAS + PROCESAMIENTO DE VOZ INTELIGENTE (NLU)
// Reconoce montos en fotos de facturas/vouchers y recibe instrucciones por voz
// para clasificar en: Casa (incl. Farmatodo), Mercado, Escuela de Hija,
// Esparcimiento, Magia con K, Papel o Bolsillos Cruzados.
// ==============================================================================

(function () {
  "use strict";

  const SCANNER_STATE = {
    isListening: false,
    recognition: null,
    ocrRunning: false,
    voiceFeedbackEnabled: true,
    ultimoTextoOCR: "",
    ultimoTextoVoz: "",
    imagenBase64Preview: null
  };

  function getSupabase() {
    return window.supabaseClient || (window.supabase && window.SUPABASE_CONFIG
      ? window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey)
      : null);
  }

  function hablarConfirmacion(texto) {
    if (!SCANNER_STATE.voiceFeedbackEnabled) return;
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(texto);
      utter.lang = "es-VE";
      utter.rate = 1.05;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn("SpeechSynthesis no disponible:", e);
    }
  }

  function toggleVoiceFeedback() {
    SCANNER_STATE.voiceFeedbackEnabled = !SCANNER_STATE.voiceFeedbackEnabled;
    const btn = document.getElementById("btn-toggle-tts");
    if (btn) {
      btn.innerText = SCANNER_STATE.voiceFeedbackEnabled ? "🔊 Respuesta Voz: ON" : "🔇 Respuesta Voz: OFF";
      btn.style.borderColor = SCANNER_STATE.voiceFeedbackEnabled ? "#10b981" : "#475569";
      btn.style.color = SCANNER_STATE.voiceFeedbackEnabled ? "#34d399" : "#94a3b8";
    }
  }

  // ============================================================================
  // 1. PRE-PROCESAMIENTO DE IMAGEN Y OCR CON TESSERACT.JS EN EL TELÉFONO
  // ============================================================================
  async function procesarFotoFactura(event) {
    const file = event.target?.files?.[0];
    if (!file) return;

    const statusEl = document.getElementById("ocr-status-box");
    const previewImg = document.getElementById("ocr-image-preview");
    const previewWrap = document.getElementById("ocr-preview-container");
    const progressFill = document.getElementById("ocr-progress-bar");

    if (previewWrap) previewWrap.style.display = "block";
    if (statusEl) {
      statusEl.innerHTML = `<span style="color:#38bdf8;">📸 Mejorando nitidez de la factura y leyendo montos con IA óptica...</span>`;
    }
    if (progressFill) progressFill.style.width = "15%";

    try {
      const processedDataUrl = await mejorarImagenParaOCR(file);
      SCANNER_STATE.imagenBase64Preview = processedDataUrl;
      if (previewImg) previewImg.src = processedDataUrl;

      if (typeof Tesseract === "undefined") {
        throw new Error("La librería óptica Tesseract.js aún está cargando. Reintenta en 2 segundos.");
      }

      SCANNER_STATE.ocrRunning = true;
      const result = await Tesseract.recognize(processedDataUrl, "spa+eng", {
        logger: m => {
          if (m.status === "recognizing text" && progressFill) {
            const pct = Math.max(20, Math.round((m.progress || 0) * 100));
            progressFill.style.width = pct + "%";
          }
        }
      });

      SCANNER_STATE.ocrRunning = false;
      if (progressFill) progressFill.style.width = "100%";

      const rawText = result?.data?.text || "";
      SCANNER_STATE.ultimoTextoOCR = rawText;

      const ocrRawBox = document.getElementById("ocr-raw-text");
      if (ocrRawBox) {
        ocrRawBox.value = rawText.trim();
      }

      const extraido = extraerDatosDeTextoOCR(rawText);
      aplicarDatosAlFormularioMovil(extraido, "OCR");

      if (extraido.monto > 0) {
        const msgExito = `Factura leída: ${extraido.monto.toLocaleString("en-US", { minimumFractionDigits: 2 })} dólares en ${obtenerNombreAmigableDestino(extraido)}.`;
        if (statusEl) {
          statusEl.innerHTML = `<span style="color:#34d399;">✅ <strong>Equivalente USD detectado: $${extraido.monto.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD</strong> (${extraido.comercioDetectado || "Factura"}). Ahora puedes dictar por voz a dónde pertenece si deseas cambiarlo.</span>`;
        }
        hablarConfirmacion(msgExito);
      } else {
        if (statusEl) {
          statusEl.innerHTML = `<span style="color:#fbbf24;">⚠️ Se leyó el texto pero el monto está borroso. Puedes dictar el monto y la categoría tocando el botón de micrófono 🎙️.</span>`;
        }
        hablarConfirmacion("No logré ver el monto con claridad. Toca el micrófono y dime cuánto fue y a qué categoría pertenece.");
      }
    } catch (err) {
      SCANNER_STATE.ocrRunning = false;
      console.error("Error en OCR:", err);
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#f87171;">⚠️ Error al procesar imagen: ${err.message}. Usa el micrófono o escribe el monto manualmente.</span>`;
      }
    }
  }

  // Aumenta contraste y escala la imagen para que las facturas térmicas de SENIAT se lean rápido y claro
  function mejorarImagenParaOCR(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1600;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);

          // Aumentar ligeramente contraste en escala de grises para recibos térmicos
          const imgData = ctx.getImageData(0, 0, w, h);
          const d = imgData.data;
          const contrast = 1.28;
          const intercept = 128 * (1 - contrast);
          for (let i = 0; i < d.length; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            const val = Math.min(255, Math.max(0, gray * contrast + intercept));
            d[i] = val;
            d[i + 1] = val;
            d[i + 2] = val;
          }
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.88));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Analiza el texto extraído de una factura venezolana (SENIAT, Punto de Venta, Pago Móvil, Zelle, Binance)
  function extraerDatosDeTextoOCR(texto) {
    const limpio = (texto || "").replace(/\r/g, "\n");
    const lower = limpio.toLowerCase();

    // 1. Detectar RIF (J-12345678-9)
    const rifMatch = limpio.match(/\b([JVGjvg]\s*[-–.]?\s*\d{7,9}\s*[-–.]?\s*\d?)\b/);
    const rif = rifMatch ? rifMatch[1].toUpperCase().replace(/\s+/g, "") : "";

    // 2. Detectar Número de Factura / Referencia
    const facMatch = limpio.match(/(?:factura|control|recibo|ref|referencia|nro|n°)\s*[:#\-]?\s*([A-Z0-9\-]{4,18})/i);
    const numFactura = facMatch ? facMatch[1].toUpperCase() : "";

    // 3. Extraer Monto Total y convertir siempre a su Equivalente en USD ($):
    const lineas = limpio.split("\n").map(l => l.trim()).filter(Boolean);
    let candidatosUsd = [];
    let candidatosPrioritarios = [];
    let candidatosGenerales = [];

    const regexNumeroMonetario = /\b(\d{1,3}(?:[.,]\d{3})+[.,]\d{2}|\d+[.,]\d{2})\b/g;

    for (const linea of lineas) {
      const lLow = linea.toLowerCase();
      if (lLow.includes("rif") || lLow.includes("telf") || lLow.includes("fecha") || lLow.includes("hora")) continue;

      const tieneIndicadorUsd = /(?:usd|us\$|\$|divisa|ref|dolar|dólar|usdt)/i.test(linea);
      const EsLineaTotal = /(?:total|pagar|pagado|monto|importe|venta|neto|bs\.?|ves|usd|usdt|\$|ref)/i.test(linea);
      let m;
      while ((m = regexNumeroMonetario.exec(linea)) !== null) {
        const valor = normalizarNumeroVenezolano(m[1]);
        if (valor > 0 && valor < 10000000) {
          if (tieneIndicadorUsd && valor < 50000) candidatosUsd.push(valor);
          if (EsLineaTotal) candidatosPrioritarios.push(valor);
          candidatosGenerales.push(valor);
        }
      }
    }

    const tasaBcv = Number(document.getElementById("mobile-tasa-bcv")?.value) || window.FINANZAS_STATE?.tasas?.tasa_bcv || 875;
    let montoUsdEquivalente = 0;

    if (candidatosUsd.length > 0) {
      // Si la factura indica explícitamente USD / $ / REF, tomamos el monto en USD directo
      montoUsdEquivalente = Math.max(...candidatosUsd);
    } else {
      let rawMax = 0;
      if (candidatosPrioritarios.length > 0) {
        rawMax = Math.max(...candidatosPrioritarios);
      } else if (candidatosGenerales.length > 0) {
        rawMax = Math.max(...candidatosGenerales);
      }
      // Si el monto leído es mayor a 1.200 y el texto menciona Bs/Bolívares (y no USD), lo convertimos a su Equivalente USD
      const mencionaUsdGlobal = /(?:usd|us\$|\$|divisa|zelle|usdt)/i.test(limpio);
      if (rawMax > 1200 && !mencionaUsdGlobal && tasaBcv > 0) {
        montoUsdEquivalente = Number((rawMax / tasaBcv).toFixed(2));
      } else {
        montoUsdEquivalente = Number(rawMax.toFixed(2));
      }
    }

    // 4. Clasificar comercio y destino automáticamente
    const clasificacion = interpretarIntencionFinanciera(limpio);

    return {
      monto: montoUsdEquivalente,
      moneda: "USD_CASH",
      rif,
      numFactura,
      entidad: clasificacion.entidad,
      categoria: clasificacion.categoria,
      tipoMovimiento: clasificacion.tipoMovimiento,
      entidadCruce: clasificacion.entidadCruce,
      aplicaDesgravamen: clasificacion.aplicaDesgravamen,
      tieneFacturaFiscal: Boolean(rif) || lower.includes("seniat") || lower.includes("factura") || lower.includes("iva"),
      comercioDetectado: clasificacion.comercioDetectado,
      conceptoSugerido: clasificacion.conceptoSugerido
    };
  }

  function normalizarNumeroVenezolano(str) {
    if (!str) return 0;
    let s = String(str).trim().replace(/[^\d.,]/g, "");
    if (!s) return 0;

    if (s.includes(".") && s.includes(",")) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
        // Formato 18.450,50
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        // Formato 18,450.50
        s = s.replace(/,/g, "");
      }
    } else if (s.includes(",")) {
      const parts = s.split(",");
      if (parts[parts.length - 1].length <= 2) {
        s = s.replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else if (s.includes(".")) {
      const parts = s.split(".");
      // Si tiene formato 18.500 (3 dígitos después del punto), es separador de miles en Bs
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        s = s.replace(/\./g, "");
      }
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  // ============================================================================
  // 2. PROCESAMIENTO DE VOZ (WEB SPEECH API) E INTÉRPRETE DE INSTRUCCIONES
  // ============================================================================
  function iniciarEscuchaVoz() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const statusVoz = document.getElementById("voice-status-text");
    const btnMic = document.getElementById("btn-mic-main");

    if (!SpeechRec) {
      if (statusVoz) {
        statusVoz.innerHTML = `<span style="color:#f87171;">⚠️ Tu navegador móvil requiere Chrome, Edge o Safari iOS para usar micrófono en vivo. También puedes escribir tu instrucción abajo.</span>`;
      }
      return;
    }

    if (SCANNER_STATE.isListening && SCANNER_STATE.recognition) {
      SCANNER_STATE.recognition.stop();
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = "es-VE";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    SCANNER_STATE.recognition = recognition;

    recognition.onstart = () => {
      SCANNER_STATE.isListening = true;
      if (btnMic) btnMic.classList.add("listening");
      if (statusVoz) {
        statusVoz.innerHTML = `<span style="color:#34d399;">🎙️ <strong>Escuchando...</strong> Di por ejemplo: <em>"Esto es de Casa en Farmatodo"</em>, <em>"Ponlo en Mercado 25.000 bolívares"</em> o <em>"Es de Magia con K pagado con mi cuenta personal"</em></span>`;
      }
    };

    recognition.onresult = event => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const boxVoz = document.getElementById("voice-transcript-input");
      if (boxVoz) boxVoz.value = transcript;

      if (event.results[event.results.length - 1].isFinal) {
        procesarInstruccionDeVoz(transcript);
      }
    };

    recognition.onerror = event => {
      SCANNER_STATE.isListening = false;
      if (btnMic) btnMic.classList.remove("listening");
      if (statusVoz) {
        statusVoz.innerHTML = `<span style="color:#fbbf24;">⚠️ Aviso de micrófono (${event.error}). Toca de nuevo para hablar o escribe la instrucción en la caja.</span>`;
      }
    };

    recognition.onend = () => {
      SCANNER_STATE.isListening = false;
      if (btnMic) btnMic.classList.remove("listening");
    };

    recognition.start();
  }

  // Procesa tanto lo que se habló por micrófono como lo que el usuario escriba/toque en los chips de voz
  function procesarInstruccionDeVoz(textoHablado) {
    const frase = (textoHablado || "").trim();
    if (!frase) return;

    SCANNER_STATE.ultimoTextoVoz = frase;
    const boxVoz = document.getElementById("voice-transcript-input");
    if (boxVoz) boxVoz.value = frase;

    const lower = frase.toLowerCase();

    // Comando directo por voz para guardar
    if (
      (lower === "guardar" || lower === "guardar gasto" || lower === "anotar gasto" || lower === "confirmar") &&
      Number(document.getElementById("scan-monto")?.value) > 0
    ) {
      guardarGastoEscaneado(new Event("submit"));
      return;
    }

    const intencion = interpretarIntencionFinanciera(frase);
    aplicarDatosAlFormularioMovil(intencion, "VOZ");

    const destinoStr = obtenerNombreAmigableDestino(intencion);
    const montoActual = Number(document.getElementById("scan-monto")?.value) || 0;
    const monedaActual = document.getElementById("scan-moneda")?.value || "VES";

    const statusVoz = document.getElementById("voice-status-text");
    if (statusVoz) {
      statusVoz.innerHTML = `<span style="color:#34d399;">✅ <strong>Instrucción aplicada:</strong> Destino &rarr; <strong>${destinoStr}</strong> ${montoActual > 0 ? `| Monto: <strong>${monedaActual === "VES" ? "Bs " : "$"}${montoActual.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</strong>` : ""}</span>`;
    }

    const msgHablado = montoActual > 0
      ? `Entendido. Asignado a ${destinoStr}, monto ${montoActual} ${monedaActual === "VES" ? "bolívares" : "dólares"}.`
      : `Entendido. Categoría cambiada a ${destinoStr}.`;
    hablarConfirmacion(msgHablado);
  }

  // Motor NLU que entiende instrucciones naturales en español venezolano para clasificar el gasto
  function interpretarIntencionFinanciera(texto) {
    const raw = (texto || "").trim();
    const lower = raw.toLowerCase();

    let entidad = "PERSONAL";
    let categoria = "PER_MERCADO";
    let tipoMovimiento = "GASTO_PERSONAL";
    let entidadCruce = "MAGIA_CON_K";
    let aplicaDesgravamen = false;
    let monedaExplicita = null;
    let comercioDetectado = "";

    // 1. Detectar Moneda hablada en la instrucción
    if (lower.includes("bolívar") || lower.includes("bolivar") || lower.includes("bs") || lower.includes("pago móvil") || lower.includes("pago movil") || lower.includes("punto de venta")) {
      monedaExplicita = "VES";
    } else if (lower.includes("usdt") || lower.includes("binance")) {
      monedaExplicita = "USDT";
    } else if (lower.includes("efectivo") || lower.includes("cash") || lower.includes("billete")) {
      monedaExplicita = "USD_CASH";
    } else if (lower.includes("zelle")) {
      monedaExplicita = "USD_ZELLE";
    } else if (lower.includes("dólar") || lower.includes("dolar") || lower.includes("usd") || lower.includes("$")) {
      monedaExplicita = "USD_CASH";
    }

    // 2. Detectar Monto dictado por voz (dígitos o palabras)
    const montoVoz = extraerMontoDeFraseHablada(lower);

    // 3. Detectar si es un CRUCE DE BOLSILLOS (ej. "es de Magia pero lo pagué con mi cuenta personal" o "gasto personal pagado con caja de Papel")
    const mencionaMagia = lower.includes("magia") || lower.includes("mazo") || lower.includes("tarot") || lower.includes("mercadolibre") || lower.includes("mercado libre") || lower.includes("alibaba");
    const mencionaPapel = lower.includes("papel") || lower.includes("adhesivo") || lower.includes("rollo") || lower.includes("fotográfico") || lower.includes("fotografico") || lower.includes("luisalba");
    const mencionaPersonal = lower.includes("mi cuenta") || lower.includes("mi bolsillo") || lower.includes("mi pago móvil") || lower.includes("mi pago movil") || lower.includes("efectivo personal") || lower.includes("dinero personal") || lower.includes("bolsillo cruzado");

    if ((mencionaMagia || mencionaPapel) && mencionaPersonal) {
      tipoMovimiento = "GASTO_CRUZADO_SOCIO_PAGA_NEGOCIO";
      entidad = mencionaPapel ? "PAPEL" : "MAGIA_CON_K";
      entidadCruce = entidad;
      categoria = "";
      comercioDetectado = `Cruce Socio -> ${entidad}`;
    } else if (lower.includes("con caja de magia") || lower.includes("con dinero de magia") || lower.includes("con plata de papel") || lower.includes("con caja de papel")) {
      tipoMovimiento = "GASTO_CRUZADO_NEGOCIO_PAGA_SOCIO";
      entidad = "PERSONAL";
      entidadCruce = mencionaPapel ? "PAPEL" : "MAGIA_CON_K";
    } else if (mencionaMagia) {
      entidad = "MAGIA_CON_K";
      tipoMovimiento = "GASTO_OPERATIVO_NEGOCIO";
      categoria = "";
      comercioDetectado = "Magia con K";
    } else if (mencionaPapel) {
      entidad = "PAPEL";
      tipoMovimiento = "GASTO_OPERATIVO_NEGOCIO";
      categoria = "";
      comercioDetectado = "Papel B2B";
    }

    // 4. Si es PERSONAL (o un cruce donde el negocio pagó algo personal), clasificar en las categorías de Gabriel:
    if (entidad === "PERSONAL") {
      if (
        lower.includes("cuota especial") ||
        lower.includes("cuotas especiales") ||
        lower.includes("inscripción") ||
        lower.includes("inscripcion") ||
        lower.includes("útiles") ||
        lower.includes("utiles") ||
        lower.includes("uniforme")
      ) {
        categoria = "SOBRE_ESCUELA_CUOTAS";
        aplicaDesgravamen = true;
        comercioDetectado = "Cuotas Especiales Escuela";
      } else if (
        lower.includes("escuela") ||
        lower.includes("colegio") ||
        lower.includes("hija") ||
        lower.includes("niña") ||
        lower.includes("nina") ||
        lower.includes("tamara") ||
        lower.includes("mensualidad") ||
        lower.includes("tarea")
      ) {
        categoria = "PER_ESCUELA_HIJA";
        aplicaDesgravamen = true;
        comercioDetectado = "Escuela de Hija";
      } else if (
        lower.includes("casa") ||
        lower.includes("hogar") ||
        lower.includes("farmatodo") ||
        lower.includes("condominio") ||
        lower.includes("corpoelec") ||
        lower.includes("luz") ||
        lower.includes("electricidad") ||
        lower.includes("agua") ||
        lower.includes("gas") ||
        lower.includes("internet") ||
        lower.includes("fibex") ||
        lower.includes("netuno") ||
        lower.includes("inter")
      ) {
        categoria = "PER_CASA";
        aplicaDesgravamen = lower.includes("condominio") || lower.includes("corpoelec");
        comercioDetectado = lower.includes("farmatodo") ? "Farmatodo (Casa)" : "Casa / Servicios";
      } else if (
        lower.includes("esparcimiento") ||
        lower.includes("exparcimiento") ||
        lower.includes("salida") ||
        lower.includes("paseo") ||
        lower.includes("restaurante") ||
        lower.includes("helado") ||
        lower.includes("pizza") ||
        lower.includes("hamburguesa") ||
        lower.includes("cine") ||
        lower.includes("sambil") ||
        lower.includes("domingo") ||
        lower.includes("familia") ||
        lower.includes("streaming") ||
        lower.includes("netflix") ||
        lower.includes("hormiga") ||
        lower.includes("café") ||
        lower.includes("cafe")
      ) {
        categoria = "PER_ESPARCIMIENTO";
        comercioDetectado = "Esparcimiento";
      } else if (
        lower.includes("mercado") ||
        lower.includes("supermercado") ||
        lower.includes("comida") ||
        lower.includes("proteína") ||
        lower.includes("proteina") ||
        lower.includes("carne") ||
        lower.includes("pollo") ||
        lower.includes("charcutería") ||
        lower.includes("charcuteria") ||
        lower.includes("verdura") ||
        lower.includes("feria") ||
        lower.includes("abasto") ||
        lower.includes("panadería") ||
        lower.includes("panaderia") ||
        lower.includes("banesco")
      ) {
        categoria = "PER_MERCADO";
        comercioDetectado = "Mercado";
      } else if (
        lower.includes("carro") ||
        lower.includes("vehículo") ||
        lower.includes("vehiculo") ||
        lower.includes("caucho") ||
        lower.includes("taller") ||
        lower.includes("mecánico") ||
        lower.includes("mecanico") ||
        lower.includes("repuesto") ||
        lower.includes("aceite") ||
        lower.includes("batería") ||
        lower.includes("bateria") ||
        lower.includes("estacionamiento") ||
        lower.includes("gasolina")
      ) {
        categoria = "PER_CARRO";
        aplicaDesgravamen = false;
        comercioDetectado = "Carro / Vehículo";
      } else if (
        lower.includes("deuda") ||
        lower.includes("deudas") ||
        lower.includes("préstamo") ||
        lower.includes("prestamo") ||
        lower.includes("abono deuda") ||
        lower.includes("pago deuda") ||
        lower.includes("compromiso")
      ) {
        categoria = "PER_DEUDAS";
        aplicaDesgravamen = false;
        comercioDetectado = "Pago de Deuda";
      } else if (
        lower.includes("salud") ||
        lower.includes("médico") ||
        lower.includes("medico") ||
        lower.includes("odont") ||
        lower.includes("clínica") ||
        lower.includes("clinica") ||
        lower.includes("locatel")
      ) {
        categoria = "SOBRE_SALUD_VEHICULO";
        aplicaDesgravamen = true;
        comercioDetectado = "Salud / Odontología";
      } else if (
        lower.includes("fondo de paz") ||
        lower.includes("emergencia") ||
        lower.includes("ahorro")
      ) {
        categoria = "FUT_FONDO_PAZ";
        tipoMovimiento = "APORTE_SOBRE";
        comercioDetectado = "Fondo de Paz";
      }
    }

    // Limpiar la frase para dejar un concepto descriptivo limpio
    let conceptoSugerido = raw
      .replace(/\s+/g, " ")
      .substring(0, 110)
      .trim();

    return {
      monto: montoVoz,
      monedaExplicita,
      entidad,
      categoria,
      tipoMovimiento,
      entidadCruce,
      aplicaDesgravamen,
      comercioDetectado,
      conceptoSugerido
    };
  }

  // Extrae montos tanto si el navegador transcribe números ("75", "18500", "24,50") como palabras ("setenta y cinco")
  function extraerMontoDeFraseHablada(lower) {
    // 1. Buscar dígitos explícitos (ej. "fueron 14500 bolívares" o "75 dólares" o "18.500,50")
    // Ignorar el número 3992 si viene del número de tarjeta TDD # 3992
    const sinTarjeta = lower.replace(/#\s*3992/g, "").replace(/tdd\s*3992/g, "");
    const matchDigitos = sinTarjeta.match(/(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/g);

    if (matchDigitos && matchDigitos.length > 0) {
      const nums = matchDigitos
        .map(x => normalizarNumeroVenezolano(x))
        .filter(n => n > 0 && n !== 2026 && n !== 2025);
      if (nums.length > 0) {
        return nums[0];
      }
    }

    // 2. Mapa básico de números hablados frecuentes si el reconocedor devolvió letras
    const palabrasMap = {
      "cien": 100, "ciento cincuenta": 150, "doscientos": 200, "trescientos": 300, "quinientos": 500, "mil": 1000,
      "setenta y cinco": 75, "ochenta": 80, "noventa": 90, "cincuenta": 50, "cuarenta": 40, "treinta": 30,
      "veinticinco": 25, "veinte": 20, "quince": 15, "diez": 10, "cinco": 5
    };
    for (const [palabra, val] of Object.entries(palabrasMap)) {
      if (lower.includes(palabra)) return val;
    }
    return 0;
  }

  function obtenerNombreAmigableDestino(datos) {
    if (datos.entidad === "MAGIA_CON_K") {
      return datos.tipoMovimiento === "GASTO_CRUZADO_SOCIO_PAGA_NEGOCIO"
        ? "Magia con K (Bolsillo Cruzado a tu favor)"
        : "Magia con K (Negocio)";
    }
    if (datos.entidad === "PAPEL") {
      return datos.tipoMovimiento === "GASTO_CRUZADO_SOCIO_PAGA_NEGOCIO"
        ? "Papel B2B (Bolsillo Cruzado a tu favor)"
        : "Papel B2B (Negocio)";
    }
    const mapaCat = {
      PER_CASA: "🏠 Casa (Servicios / Farmatodo)",
      PER_MERCADO: "🛒 Mercado",
      PER_ESCUELA_HIJA: "🎒 Escuela de Hija ($75)",
      PER_CARRO: "🚗 Carro (Gasolina / Repuestos)",
      PER_DEUDAS: "💳 Deudas (Pagos / Cuotas)",
      SOBRE_ESCUELA_CUOTAS: "🎓 Cuotas Especiales Escuela",
      PER_ESPARCIMIENTO: "🎡 Esparcimiento",
      SOBRE_SALUD_VEHICULO: "🏥 Salud / Odontología",
      FUT_FONDO_PAZ: "🛡️ Fondo de Paz"
    };
    return mapaCat[datos.categoria] || "Presupuesto Personal";
  }

  // Aplica los datos extraídos (por Cámara OCR o por Comando de Voz) a los controles de la pantalla móvil
  function aplicarDatosAlFormularioMovil(datos, fuente) {
    const montoInput = document.getElementById("scan-monto");
    const monedaSelect = document.getElementById("scan-moneda");
    const entidadSelect = document.getElementById("scan-entidad");
    const catSelect = document.getElementById("scan-categoria");
    const tipoSelect = document.getElementById("scan-tipo-mov");
    const conceptoInput = document.getElementById("scan-concepto");
    const rifInput = document.getElementById("scan-rif");
    const checkFiscal = document.getElementById("scan-factura-fiscal");
    const checkIslr = document.getElementById("scan-desgravamen-islr");

    // Si viene de VOZ y el usuario solo dijo "ponlo en Casa" sin mencionar un monto, conservamos el monto que leyó la cámara OCR
    if (datos.monto && datos.monto > 0 && montoInput) {
      montoInput.value = datos.monto.toFixed(2);
    }

    if (datos.monedaExplicita && monedaSelect) {
      monedaSelect.value = datos.monedaExplicita;
    } else if (fuente === "OCR" && datos.moneda && monedaSelect) {
      monedaSelect.value = datos.moneda;
    }

    if (tipoSelect && datos.tipoMovimiento) {
      tipoSelect.value = datos.tipoMovimiento;
    }

    if (entidadSelect && datos.entidad) {
      entidadSelect.value = datos.entidad;
    }

    if (catSelect && datos.categoria) {
      catSelect.value = datos.categoria;
    }

    if (rifInput && datos.rif) {
      rifInput.value = datos.rif + (datos.numFactura ? ` / #${datos.numFactura}` : "");
    }

    if (checkFiscal && datos.tieneFacturaFiscal !== undefined) {
      checkFiscal.checked = Boolean(datos.tieneFacturaFiscal);
    }

    if (checkIslr && datos.aplicaDesgravamen !== undefined) {
      checkIslr.checked = Boolean(datos.aplicaDesgravamen);
    }

    if (conceptoInput) {
      if (fuente === "VOZ" && datos.conceptoSugerido) {
        conceptoInput.value = `[Voz] ${datos.conceptoSugerido}`;
      } else if (fuente === "OCR" && !conceptoInput.value) {
        conceptoInput.value = `[Foto Factura] ${datos.comercioDetectado || "Comprobante escaneado"}${datos.rif ? " (" + datos.rif + ")" : ""}`;
      }
    }

    actualizarUIFromControlesMovil();
  }

  // Actualiza los botones visuales (pills) y el cálculo bimonetario en vivo en el teléfono
  function actualizarUIFromControlesMovil() {
    const state = window.FINANZAS_STATE || { tasas: { tasa_bcv: 875, tasa_binance: 1015 }, categorias: [] };
    const bcv = Number(document.getElementById("mobile-tasa-bcv")?.value) || state.tasas?.tasa_bcv || 875;
    const binance = Number(document.getElementById("mobile-tasa-binance")?.value) || state.tasas?.tasa_binance || 1015;

    const monto = Number(document.getElementById("scan-monto")?.value) || 0;
    const moneda = document.getElementById("scan-moneda")?.value || "VES";
    const entidad = document.getElementById("scan-entidad")?.value || "PERSONAL";
    const categoria = document.getElementById("scan-categoria")?.value || "PER_CASA";
    const groupCat = document.getElementById("mobile-group-categoria");

    if (groupCat) {
      groupCat.style.display = entidad === "PERSONAL" ? "block" : "none";
    }

    // Marcar botón rápido activo
    document.querySelectorAll(".quick-cat-btn").forEach(btn => {
      const btnEnt = btn.getAttribute("data-entidad");
      const btnCat = btn.getAttribute("data-cat");
      const activo = (entidad === "PERSONAL" && btnEnt === "PERSONAL" && btnCat === categoria) ||
                     (entidad !== "PERSONAL" && btnEnt === entidad);
      btn.classList.toggle("active", activo);
    });

    const usdBcv = moneda === "VES" ? (bcv > 0 ? monto / bcv : 0) : monto;
    const usdReal = moneda === "VES" ? (binance > 0 ? monto / binance : 0) : monto;
    const ahorro = moneda === "VES" ? Math.max(0, usdBcv - usdReal) : 0;

    const convBox = document.getElementById("mobile-conversion-box");
    if (convBox) {
      let infoPresupuesto = "";
      if (entidad === "PERSONAL" && state.categorias) {
        const catObj = state.categorias.find(c => c.codigo === categoria);
        if (catObj) {
          const dispAntes = Math.max(0, Number(catObj.presupuesto_mensual_usd) - Number(catObj.gasto_acumulado_mes_usd));
          const dispDespues = Math.max(0, dispAntes - usdBcv);
          infoPresupuesto = `
            <div style="margin-top:8px; padding-top:8px; border-top:1px dashed rgba(255,255,255,0.12); display:flex; justify-content:space-between; font-size:12px;">
              <span style="color:#cbd5e1;">Disponible en <strong>${catObj.icono} ${catObj.nombre.split("(")[0]}</strong>:</span>
              <strong style="color:${dispDespues > 10 ? "#34d399" : "#fbbf24"};">$${dispAntes.toFixed(2)} &rarr; $${dispDespues.toFixed(2)} USD</strong>
            </div>
          `;
        }
      }

      convBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#94a3b8; font-size:12.5px; font-weight:700;">💵 Monto Equivalente a Guardar en USD:</span>
          <strong style="font-size:18px; color:#34d399;">$${usdBcv.toFixed(2)} USD</strong>
        </div>
        ${infoPresupuesto}
      `;
    }
  }

  function seleccionarDestinoRapido(entidad, categoria) {
    const entSelect = document.getElementById("scan-entidad");
    const catSelect = document.getElementById("scan-categoria");
    const tipoSelect = document.getElementById("scan-tipo-mov");

    if (entSelect) entSelect.value = entidad;
    if (entidad === "PERSONAL") {
      if (catSelect && categoria) catSelect.value = categoria;
      if (tipoSelect) tipoSelect.value = categoria === "FUT_FONDO_PAZ" ? "APORTE_SOBRE" : "GASTO_PERSONAL";
    } else {
      if (tipoSelect) tipoSelect.value = "GASTO_OPERATIVO_NEGOCIO";
    }
    actualizarUIFromControlesMovil();
  }

  // ============================================================================
  // 3. GUARDAR EL GASTO ESCANEADO / DICTADO EN SUPABASE CLOUD
  // ============================================================================
  async function guardarGastoEscaneado(event) {
    if (event && event.preventDefault) event.preventDefault();

    const monto = Number(document.getElementById("scan-monto")?.value) || 0;
    if (monto <= 0) {
      alert("Ingresa o escanea un monto mayor a 0 antes de guardar.");
      return;
    }

    const state = window.FINANZAS_STATE || { tasas: { tasa_bcv: 875, tasa_binance: 1015 } };
    const bcv = Number(document.getElementById("mobile-tasa-bcv")?.value) || state.tasas?.tasa_bcv || 875;
    const binance = Number(document.getElementById("mobile-tasa-binance")?.value) || state.tasas?.tasa_binance || 1015;

    const fecha = document.getElementById("scan-fecha")?.value || new Date().toISOString().split("T")[0];
    const moneda = document.getElementById("scan-moneda")?.value || "VES";
    const entidad = document.getElementById("scan-entidad")?.value || "PERSONAL";
    const categoria = document.getElementById("scan-categoria")?.value || "PER_CASA";
    const tipoMov = document.getElementById("scan-tipo-mov")?.value || (entidad === "PERSONAL" ? "GASTO_PERSONAL" : "GASTO_OPERATIVO_NEGOCIO");
    const rif = (document.getElementById("scan-rif")?.value || "").trim();
    let concepto = (document.getElementById("scan-concepto")?.value || "").trim();

    if (!concepto) {
      concepto = `[Escáner Móvil] Gasto en ${entidad === "PERSONAL" ? categoria : entidad}`;
    }
    if (rif && !concepto.includes(rif)) {
      concepto += ` [RIF/Fac: ${rif}]`;
    }

    const tieneFactura = Boolean(document.getElementById("scan-factura-fiscal")?.checked);
    const aplicaDesgravamen = Boolean(document.getElementById("scan-desgravamen-islr")?.checked);

    const usdEquiv = moneda === "VES" ? Number((monto / bcv).toFixed(2)) : Number(monto.toFixed(2));

    const esCruce = tipoMov === "GASTO_CRUZADO_SOCIO_PAGA_NEGOCIO" || tipoMov === "GASTO_CRUZADO_NEGOCIO_PAGA_SOCIO";

    const txPayload = {
      fecha,
      entidad_codigo: entidad,
      tipo_movimiento: tipoMov,
      categoria_codigo: entidad === "PERSONAL" ? categoria : null,
      concepto,
      moneda_origen: "USD",
      monto_origen: usdEquiv,
      tasa_bcv: bcv,
      tasa_binance: binance,
      monto_usd_bcv: usdEquiv,
      monto_usd_real: usdEquiv,
      ahorro_cambiario_usd: 0,
      tiene_factura_fiscal: tieneFactura,
      aplica_desgravamen_islr: aplicaDesgravamen,
      es_gasto_hormiga: (entidad === "PERSONAL" && usdEquiv < 10),
      es_bolsillo_cruzado: esCruce,
      entidad_pagadora_cruce: esCruce ? (tipoMov === "GASTO_CRUZADO_SOCIO_PAGA_NEGOCIO" ? "PERSONAL" : entidad) : null,
      estado_conciliacion: "CONFIRMADO"
    };

    let crucePayload = null;
    if (esCruce) {
      const empCodigo = entidad === "PERSONAL" ? "MAGIA_CON_K" : entidad;
      crucePayload = {
        id: "cr-" + Date.now(),
        fecha,
        emprendimiento_codigo: empCodigo,
        direccion: tipoMov === "GASTO_CRUZADO_SOCIO_PAGA_NEGOCIO" ? "SOCIO_PRESTA_A_NEGOCIO" : "NEGOCIO_ADELANTA_A_SOCIO",
        concepto,
        monto_usd_real: usdEquiv,
        moneda_origen: "USD",
        estado: "PENDIENTE",
        notas: `Registrado desde Escáner Móvil por Voz/Cámara.`
      };
    }

    const btnSave = document.getElementById("btn-save-mobile");
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.innerText = "⏳ Guardando en Supabase Cloud...";
    }

    let guardadoOk = false;
    if (typeof window.guardarTransaccionCloud === "function") {
      guardadoOk = await window.guardarTransaccionCloud(txPayload, crucePayload);
    } else {
      const client = getSupabase();
      if (client) {
        const { error } = await client.from("fin_transacciones").insert([txPayload]);
        guardadoOk = !error;
      }
    }

    if (btnSave) {
      btnSave.disabled = false;
      btnSave.innerText = "✅ Guardar Gasto en Supabase Cloud";
    }

    hablarConfirmacion(`Gasto guardado exitosamente por ${usdEquiv} dólares.`);

    // Limpiar monto y concepto para la siguiente factura
    document.getElementById("scan-monto").value = "";
    document.getElementById("scan-concepto").value = "";
    document.getElementById("scan-rif").value = "";
    if (document.getElementById("voice-transcript-input")) {
      document.getElementById("voice-transcript-input").value = "";
    }

    actualizarUIFromControlesMovil();
    renderHistorialRecienteMovil();
  }

  function renderHistorialRecienteMovil() {
    const container = document.getElementById("mobile-recent-list");
    if (!container || !window.FINANZAS_STATE) return;

    const lista = (window.FINANZAS_STATE.transacciones || []).slice(0, 6);
    if (lista.length === 0) {
      container.innerHTML = `<div style="color:#94a3b8; font-size:12.5px; text-align:center; padding:12px;">Aún no hay gastos recientes.</div>`;
      return;
    }

    container.innerHTML = lista.map(tx => {
      const montoUsd = Number(tx.monto_usd_bcv || tx.monto_usd_real || tx.monto_origen || 0);

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#0f172a; border:1px solid rgba(255,255,255,0.07); border-radius:10px; margin-bottom:8px;">
          <div style="max-width:68%;">
            <div style="font-size:13px; font-weight:700; color:#f8fafc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${tx.concepto}</div>
            <div style="font-size:11px; color:#94a3b8;">${tx.fecha} &bull; <strong style="color:#38bdf8;">${tx.categoria_codigo || tx.entidad_codigo}</strong></div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:14px; font-weight:800; color:#34d399;">$${montoUsd.toFixed(2)} USD</div>
          </div>
        </div>
      `;
    }).join("");
  }

  // Exponer API global
  window.procesarFotoFactura = procesarFotoFactura;
  window.iniciarEscuchaVoz = iniciarEscuchaVoz;
  window.procesarInstruccionDeVoz = procesarInstruccionDeVoz;
  window.seleccionarDestinoRapido = seleccionarDestinoRapido;
  window.actualizarUIFromControlesMovil = actualizarUIFromControlesMovil;
  window.guardarGastoEscaneado = guardarGastoEscaneado;
  window.toggleVoiceFeedback = toggleVoiceFeedback;
  window.renderHistorialRecienteMovil = renderHistorialRecienteMovil;

  document.addEventListener("DOMContentLoaded", () => {
    const fechaInput = document.getElementById("scan-fecha");
    if (fechaInput) fechaInput.value = new Date().toISOString().split("T")[0];
    setTimeout(() => {
      actualizarUIFromControlesMovil();
      renderHistorialRecienteMovil();
    }, 350);
  });
})();
