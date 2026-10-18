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
        state.categorias = resCategorias.data;
      }
      if (resObligaciones.data && resObligaciones.data.length > 0) {
        state.obligacionesFiscales = resObligaciones.data;
      }
      if (resCruces.data) {
        state.crucesPatrimoniales = resCruces.data;
      }
      if (resTransacciones.data && resTransacciones.data.length > 0) {
        state.transacciones = resTransacciones.data;
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

  window.sincronizarTunelSupabase = sincronizarTunelSupabase;
  window.guardarTransaccionCloud = guardarTransaccionCloud;
  window.liquidarCrucePatrimonialCloud = liquidarCrucePatrimonialCloud;
  window.actualizarTopeCategoriaCloud = actualizarTopeCategoriaCloud;
  window.actualizarProvisionFiscalCloud = actualizarProvisionFiscalCloud;
  window.showToast = showToast;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => sincronizarTunelSupabase(false), 250);
    });
  } else {
    setTimeout(() => sincronizarTunelSupabase(false), 250);
  }
})();
