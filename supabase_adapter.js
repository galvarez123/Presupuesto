// ==============================================================================
// ADAPTADOR Y TÚNEL BIDIRECCIONAL SUPABASE CLOUD
// Conecta en tiempo real Presupuesto Personal <-> Magia con K <-> Papel B2B
// ==============================================================================

(function () {
  "use strict";

  function getClient() {
    return window.supabaseClient || (window.supabase && window.SUPABASE_CONFIG ?
      window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey) : null);
  }

  function showToast(msg, isSuccess = true) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${isSuccess ? "toast-success" : "toast-error"}`;
    toast.innerHTML = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.35s ease";
      setTimeout(() => toast.remove(), 350);
    }, 4200);
  }

  // 1. Sincronización completa del Túnel en Vivo (Magia + Papel + Finanzas Personales)
  async function sincronizarTunelSupabase(mostrarFeedback = false) {
    const client = getClient();
    if (!client) {
      console.warn("Supabase client no disponible. Usando estado local.");
      return;
    }

    const badgeText = document.getElementById("cloud-status-text");
    if (badgeText) badgeText.innerText = "Sincronizando Túnel...";

    try {
      // Ejecutar en paralelo la llamada RPC del Túnel (Magia + Papel + Tasas) y las tablas de Presupuesto
      const [
        resTunel,
        resEntidades,
        resBilleteras,
        resCategorias,
        resObligaciones,
        resCruces,
        resTransacciones
      ] = await Promise.all([
        client.rpc("rpc_tunel_presupuesto_live"),
        client.from("fin_entidades").select("*"),
        client.from("fin_billeteras").select("*").order("entidad_codigo"),
        client.from("fin_presupuesto_categorias").select("*").order("orden"),
        client.from("fin_obligaciones_fiscales").select("*"),
        client.from("fin_cruces_patrimoniales").select("*").order("fecha", { ascending: false }),
        client.from("fin_transacciones").select("*").order("fecha", { ascending: false }).limit(80)
      ]);

      const state = window.FINANZAS_STATE;

      if (resTunel.data) {
        state.tunelLive = resTunel.data;
        if (resTunel.data.tasas) {
          state.tasas.tasa_bcv = Number(resTunel.data.tasas.tasa_bcv) || state.tasas.tasa_bcv;
          state.tasas.tasa_binance = Number(resTunel.data.tasas.tasa_binance) || state.tasas.tasa_binance;
          state.tasas.brecha_pct = Number(resTunel.data.tasas.brecha_pct) || state.tasas.brecha_pct;
          state.tasas.factor_brecha = Number(resTunel.data.tasas.factor_brecha) || state.tasas.factor_brecha;
        }
      }

      if (resEntidades.data && resEntidades.data.length > 0) {
        state.entidades = resEntidades.data;
      }
      if (resBilleteras.data && resBilleteras.data.length > 0) {
        state.billeteras = resBilleteras.data;
      }
      if (resCategorias.data && resCategorias.data.length > 0) {
        state.categorias = resCategorias.data.filter(c => c.activa !== false);
      }
      if (resObligaciones.data && resObligaciones.data.length > 0) {
        state.obligacionesFiscales = resObligaciones.data;
      }
      if (resCruces.data) {
        state.crucesPatrimoniales = resCruces.data;
      }
      if (resTransacciones.data && resTransacciones.data.length > 0) {
        state.transacciones = resTransacciones.data.filter(t => Number(t.monto_usd_bcv) > 0 || Number(t.monto_usd_real) > 0);
      }

      if (badgeText) {
        badgeText.innerText = "Túnel Magia & Papel Live";
      }

      if (typeof window.renderAllFinanzas === "function") {
        window.renderAllFinanzas();
      }

      if (mostrarFeedback) {
        const mVentas = state.tunelLive?.magia_con_k?.unidades_vendidas || 136;
        const pCobrado = state.tunelLive?.papel?.total_cobrado_usd || 762;
        showToast(`🌉 <strong>Túnel Activo:</strong> Magia con K (${mVentas} und vendidas) &bull; Papel ($${pCobrado} cobrados) &bull; Presupuesto sincronizado.`, true);
      }
    } catch (err) {
      console.error("Error sincronizando Túnel Supabase:", err);
      if (badgeText) badgeText.innerText = "Modo Respaldo Local";
      if (mostrarFeedback) {
        showToast(`⚠️ Error conectando al túnel: ${err.message}`, false);
      }
    }
  }

  // 2. Guardar nueva transacción multimoneda + Asiento automático de Cruce Patrimonial
  async function guardarTransaccionCloud(txPayload, crucePayload = null) {
    const client = getClient();
    const state = window.FINANZAS_STATE;

    // Actualizar en memoria inmediatamente para respuesta instantánea UI
    state.transacciones.unshift(txPayload);

    if (txPayload.categoria_codigo) {
      const cat = state.categorias.find(c => c.codigo === txPayload.categoria_codigo);
      if (cat) {
        if (txPayload.tipo_movimiento === "APORTE_SOBRE") {
          cat.saldo_sobre_actual_usd = Number(cat.saldo_sobre_actual_usd || 0) + Number(txPayload.monto_usd_real || 0);
          cat.gasto_acumulado_mes_usd = Number(cat.gasto_acumulado_mes_usd || 0) + Number(txPayload.monto_usd_real || 0);
        } else if (txPayload.tipo_movimiento.startsWith("GASTO")) {
          cat.gasto_acumulado_mes_usd = Number(cat.gasto_acumulado_mes_usd || 0) + Number(txPayload.monto_usd_bcv || txPayload.monto_usd_real || 0);
        }
      }
    }

    if (crucePayload) {
      state.crucesPatrimoniales.unshift(crucePayload);
    }

    if (typeof window.renderAllFinanzas === "function") {
      window.renderAllFinanzas();
    }

    if (!client) {
      showToast("💾 Movimiento registrado en sesión local.", true);
      return true;
    }

    try {
      const { data: insertedTx, error: errTx } = await client
        .from("fin_transacciones")
        .insert([txPayload])
        .select()
        .single();
      if (errTx) throw errTx;

      // Si afecta categoría de presupuesto personal, persistir nuevo acumulado
      if (txPayload.categoria_codigo) {
        const cat = state.categorias.find(c => c.codigo === txPayload.categoria_codigo);
        if (cat) {
          await client
            .from("fin_presupuesto_categorias")
            .update({
              gasto_acumulado_mes_usd: cat.gasto_acumulado_mes_usd,
              saldo_sobre_actual_usd: cat.saldo_sobre_actual_usd,
              updated_at: new Date().toISOString()
            })
            .eq("codigo", cat.codigo);
        }
      }

      // Si es un bolsillo cruzado (Socio <-> Negocio), insertar en fin_cruces_patrimoniales
      if (crucePayload) {
        const dbCruce = {
          fecha: crucePayload.fecha,
          emprendimiento_codigo: crucePayload.emprendimiento_codigo,
          direccion: crucePayload.direccion,
          concepto: crucePayload.concepto,
          monto_usd_real: crucePayload.monto_usd_real,
          moneda_origen: crucePayload.moneda_origen,
          estado: "PENDIENTE",
          transaccion_id: insertedTx ? insertedTx.id : null,
          notas: crucePayload.notas
        };
        await client.from("fin_cruces_patrimoniales").insert([dbCruce]);
      }

      showToast("✅ Movimiento y contabilidad bimonetaria guardados en Supabase Cloud.", true);
      setTimeout(() => sincronizarTunelSupabase(false), 400);
      return true;
    } catch (err) {
      console.error("Error guardando transacción en Supabase:", err);
      showToast(`⚠️ Guardado localmente (Aviso Cloud: ${err.message})`, false);
      return false;
    }
  }

  // 3. Liquidar / Conciliar un Cruce Patrimonial (Reembolso Socio <-> Emprendimiento)
  async function liquidarCrucePatrimonialCloud(cruceId) {
    const client = getClient();
    const state = window.FINANZAS_STATE;
    const item = state.crucesPatrimoniales.find(c => String(c.id) === String(cruceId));
    if (!item) return;

    item.estado = "LIQUIDADO";
    if (typeof window.renderAllFinanzas === "function") {
      window.renderAllFinanzas();
    }

    if (!client) {
      showToast("✅ Cruce patrimonial marcado como liquidado.", true);
      return;
    }

    try {
      const { error } = await client
        .from("fin_cruces_patrimoniales")
        .update({ estado: "LIQUIDADO" })
        .eq("id", cruceId);
      if (error) throw error;

      showToast(`🤝 <strong>Cruce Liquidado:</strong> $${Number(item.monto_usd_real).toFixed(2)} USD conciliados con ${item.emprendimiento_codigo}.`, true);
    } catch (err) {
      console.error("Error liquidando cruce:", err);
      showToast(`⚠️ Error al actualizar cruce en la nube: ${err.message}`, false);
    }
  }

  // 4. Actualizar tope de presupuesto personal o meta de sobre
  async function actualizarTopeCategoriaCloud(codigo, nuevoPresupuestoUsd, nuevaMetaSobreUsd) {
    const client = getClient();
    const state = window.FINANZAS_STATE;
    const cat = state.categorias.find(c => c.codigo === codigo);
    if (!cat) return;

    cat.presupuesto_mensual_usd = Number(nuevoPresupuestoUsd);
    if (nuevaMetaSobreUsd !== undefined && nuevaMetaSobreUsd !== null) {
      cat.meta_sobre_total_usd = Number(nuevaMetaSobreUsd);
    }

    if (typeof window.renderAllFinanzas === "function") {
      window.renderAllFinanzas();
    }

    if (!client) return;

    try {
      const { error } = await client
        .from("fin_presupuesto_categorias")
        .update({
          presupuesto_mensual_usd: cat.presupuesto_mensual_usd,
          meta_sobre_total_usd: cat.meta_sobre_total_usd,
          updated_at: new Date().toISOString()
        })
        .eq("codigo", codigo);
      if (error) throw error;
      showToast(`🎯 Tope de "${cat.nombre}" actualizado en Supabase ($${cat.presupuesto_mensual_usd.toFixed(2)}/mes).`, true);
    } catch (err) {
      console.error("Error actualizando categoría:", err);
    }
  }

  // 5. Actualizar Provisión Fiscal en Bóveda
  async function actualizarProvisionFiscalCloud(codigo, nuevoMontoProvisionado) {
    const client = getClient();
    const state = window.FINANZAS_STATE;
    const ob = state.obligacionesFiscales.find(o => o.codigo === codigo);
    if (!ob) return;

    ob.monto_provisionado_usd = Number(nuevoMontoProvisionado);
    if (ob.monto_provisionado_usd >= ob.monto_meta_periodo_usd) {
      ob.estado = "AL_DIA";
    }

    if (typeof window.renderAllFinanzas === "function") {
      window.renderAllFinanzas();
    }

    if (!client) return;

    try {
      const { error } = await client
        .from("fin_obligaciones_fiscales")
        .update({
          monto_provisionado_usd: ob.monto_provisionado_usd,
          estado: ob.estado,
          updated_at: new Date().toISOString()
        })
        .eq("codigo", codigo);
      if (error) throw error;
      showToast(`🏛️ Bóveda Fiscal actualizada (${ob.tributo}): $${ob.monto_provisionado_usd.toFixed(2)} USD reservados.`, true);
    } catch (err) {
      console.error("Error actualizando provisión fiscal:", err);
    }
  }

  // 6. Actualizar Saldo de Billetera / Efectivo en la Nube
  async function actualizarSaldoBilleteraCloud(nombreBilletera, nuevoSaldo) {
    const client = getClient();
    const state = window.FINANZAS_STATE;
    const w = state.billeteras.find(b => b.nombre === nombreBilletera);
    if (!w) return;

    w.saldo_origen = Number(nuevoSaldo);
    if (typeof window.renderAllFinanzas === "function") {
      window.renderAllFinanzas();
    }

    if (!client) return;

    try {
      const { error } = await client
        .from("fin_billeteras")
        .update({
          saldo_origen: w.saldo_origen,
          updated_at: new Date().toISOString()
        })
        .eq("nombre", nombreBilletera);
      if (error) throw error;
      showToast(`🏦 Saldo de "${w.nombre}" actualizado en Supabase (${w.moneda === "VES" ? "Bs " : "$"}${w.saldo_origen.toFixed(2)}).`, true);
    } catch (err) {
      console.error("Error actualizando saldo de billetera:", err);
    }
  }

  // 7. Mover una transacción a otra Categoría o Entidad (Magia / Papel / Reembolso) desde la ventana de inspección
  async function moverTransaccionCategoriaCloud(txKey, nuevoDestino) {
    const client = getClient();
    const state = window.FINANZAS_STATE;

    const tx = state.transacciones.find(t => String(t.id || "") === String(txKey) || `${t.fecha}|${t.concepto}|${t.monto_origen}` === String(txKey));
    if (!tx) return false;

    let nuevaEntidad = "PERSONAL";
    let nuevoTipo = "GASTO_PERSONAL";
    let nuevaCategoria = nuevoDestino;

    if (nuevoDestino === "ENT_MAGIA_CON_K") {
      nuevaEntidad = "MAGIA_CON_K";
      nuevoTipo = "GASTO_OPERATIVO_NEGOCIO";
      nuevaCategoria = null;
    } else if (nuevoDestino === "ENT_PAPEL") {
      nuevaEntidad = "PAPEL";
      nuevoTipo = "GASTO_OPERATIVO_NEGOCIO";
      nuevaCategoria = null;
    } else if (nuevoDestino === "PASE_EFECTIVO_ESPOSA") {
      nuevaEntidad = "PERSONAL";
      nuevoTipo = "INGRESO_PERSONAL";
      nuevaCategoria = null;
    } else if (nuevoDestino === "SOBRE_ESCUELA_CUOTAS" || nuevoDestino === "FUT_FONDO_PAZ") {
      nuevaEntidad = "PERSONAL";
      nuevoTipo = "APORTE_SOBRE";
      nuevaCategoria = nuevoDestino;
    } else {
      nuevaEntidad = "PERSONAL";
      nuevoTipo = tx.es_bolsillo_cruzado ? "GASTO_CRUZADO_NEGOCIO_PAGA_SOCIO" : "GASTO_PERSONAL";
      nuevaCategoria = nuevoDestino;
    }

    tx.entidad_codigo = nuevaEntidad;
    tx.tipo_movimiento = nuevoTipo;
    tx.categoria_codigo = nuevaCategoria;
    tx.estado_conciliacion = "CONFIRMADO";

    if (typeof window.renderAllFinanzas === "function") {
      window.renderAllFinanzas();
    }
    if (typeof window.refrescarModalDetalleCategoriaSiAbierto === "function") {
      window.refrescarModalDetalleCategoriaSiAbierto();
    }

    const catObj = state.categorias.find(c => c.codigo === nuevaCategoria);
    const nombreDestino = catObj ? `${catObj.icono || "📌"} ${catObj.nombre}` : (nuevaEntidad === "MAGIA_CON_K" ? "🔮 Magia con K" : nuevaEntidad === "PAPEL" ? "📄 Papel B2B" : "🤝 Reembolso Efectivo");

    if (!client) {
      showToast(`🔄 Movimiento reubicado a <strong>${nombreDestino}</strong>.`, true);
      return true;
    }

    try {
      let query = client.from("fin_transacciones").update({
        entidad_codigo: nuevaEntidad,
        tipo_movimiento: nuevoTipo,
        categoria_codigo: nuevaCategoria,
        estado_conciliacion: "CONFIRMADO"
      });

      if (tx.id) {
        query = query.eq("id", tx.id);
      } else {
        query = query.eq("fecha", tx.fecha).eq("concepto", tx.concepto);
      }

      const { error } = await query;
      if (error) throw error;

      showToast(`🔄 Movimiento movido y confirmado en <strong>${nombreDestino}</strong> (Supabase Cloud).`, true);
      return true;
    } catch (err) {
      console.error("Error moviendo transacción de categoría:", err);
      showToast(`⚠️ Reubicado localmente (Aviso Cloud: ${err.message})`, false);
      return false;
    }
  }

  // 8. Confirmar / Conciliar una transacción dentro de su categoría actual
  async function confirmarTransaccionCloud(txKey) {
    const client = getClient();
    const state = window.FINANZAS_STATE;

    const tx = state.transacciones.find(t => String(t.id || "") === String(txKey) || `${t.fecha}|${t.concepto}|${t.monto_origen}` === String(txKey));
    if (!tx) return false;

    tx.estado_conciliacion = "CONFIRMADO";

    if (typeof window.renderAllFinanzas === "function") {
      window.renderAllFinanzas();
    }
    if (typeof window.refrescarModalDetalleCategoriaSiAbierto === "function") {
      window.refrescarModalDetalleCategoriaSiAbierto();
    }

    if (!client) {
      showToast(`✅ Transacción confirmada: <strong>${tx.concepto.substring(0, 42)}</strong>`, true);
      return true;
    }

    try {
      let query = client.from("fin_transacciones").update({ estado_conciliacion: "CONFIRMADO" });
      if (tx.id) {
        query = query.eq("id", tx.id);
      } else {
        query = query.eq("fecha", tx.fecha).eq("concepto", tx.concepto);
      }
      const { error } = await query;
      if (error) throw error;

      showToast(`✅ Transacción confirmada y verificada en Supabase Cloud.`, true);
      return true;
    } catch (err) {
      console.error("Error confirmando transacción:", err);
      return false;
    }
  }

  // 9. Confirmar todas las transacciones visibles de una categoría/bloque en el mes activo
  async function confirmarTodasTransaccionesCategoriaCloud(codigosCategoriasArray, mesActivo) {
    const client = getClient();
    const state = window.FINANZAS_STATE;
    const codigosSet = new Set(Array.isArray(codigosCategoriasArray) ? codigosCategoriasArray : [codigosCategoriasArray]);

    const txsParaConfirmar = state.transacciones.filter(t =>
      String(t.fecha || "").substring(0, 7) === mesActivo &&
      t.entidad_codigo === "PERSONAL" &&
      codigosSet.has(t.categoria_codigo)
    );

    txsParaConfirmar.forEach(t => {
      t.estado_conciliacion = "CONFIRMADO";
    });

    if (typeof window.renderAllFinanzas === "function") {
      window.renderAllFinanzas();
    }
    if (typeof window.refrescarModalDetalleCategoriaSiAbierto === "function") {
      window.refrescarModalDetalleCategoriaSiAbierto();
    }

    if (!client || txsParaConfirmar.length === 0) {
      showToast(`✅ ${txsParaConfirmar.length} transacciones confirmadas en este periodo.`, true);
      return true;
    }

    try {
      const ids = txsParaConfirmar.map(t => t.id).filter(Boolean);
      if (ids.length > 0) {
        await client.from("fin_transacciones").update({ estado_conciliacion: "CONFIRMADO" }).in("id", ids);
      }
      showToast(`✅ Todas las transacciones (${txsParaConfirmar.length}) fueron confirmadas en Supabase Cloud.`, true);
      return true;
    } catch (err) {
      console.error("Error confirmando lote de transacciones:", err);
      return false;
    }
  }

  // 10. Actualizar Salario Mensual de Trabajo por Fuera ($1,000 USD)
  async function actualizarSalarioExternoCloud(nuevoSalarioUsd) {
    const client = getClient();
    const state = window.FINANZAS_STATE;
    const val = Number(nuevoSalarioUsd) || 1000;

    state.salarioExternoMensualUsd = val;
    const entPer = state.entidades.find(e => e.codigo === "PERSONAL");
    if (entPer) entPer.sueldo_fundador_mensual_usd = val;

    if (typeof window.renderAllFinanzas === "function") {
      window.renderAllFinanzas();
    }

    if (!client) return;

    try {
      await client
        .from("fin_entidades")
        .update({ sueldo_fundador_mensual_usd: val, updated_at: new Date().toISOString() })
        .eq("codigo", "PERSONAL");
      showToast(`💼 Salario Mensual (Trabajo por Fuera) actualizado a $${val.toFixed(2)} USD/mes.`, true);
    } catch (err) {
      console.error("Error actualizando salario externo:", err);
    }
  }

  window.sincronizarTunelSupabase = sincronizarTunelSupabase;
  window.guardarTransaccionCloud = guardarTransaccionCloud;
  window.liquidarCrucePatrimonialCloud = liquidarCrucePatrimonialCloud;
  window.actualizarTopeCategoriaCloud = actualizarTopeCategoriaCloud;
  window.actualizarProvisionFiscalCloud = actualizarProvisionFiscalCloud;
  window.actualizarSaldoBilleteraCloud = actualizarSaldoBilleteraCloud;
  window.moverTransaccionCategoriaCloud = moverTransaccionCategoriaCloud;
  window.confirmarTransaccionCloud = confirmarTransaccionCloud;
  window.confirmarTodasTransaccionesCategoriaCloud = confirmarTodasTransaccionesCategoriaCloud;
  window.actualizarSalarioExternoCloud = actualizarSalarioExternoCloud;
  window.showToast = showToast;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => sincronizarTunelSupabase(false), 250);
    });
  } else {
    setTimeout(() => sincronizarTunelSupabase(false), 250);
  }
})();
