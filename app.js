// ==============================================================================
// MOTOR PRINCIPAL DE FINANZAS PERSONALES, SEPARACIÓN DE EMPRENDIMIENTOS Y TRIBUTOS VE
// Implementa la Skill: experto-presupuesto-y-finanzas-ve
// ==============================================================================

(function () {
  "use strict";

  let chartBloques = null;
  let chartEjecucion = null;
  let chartEvolucionMensual = null;

  const NOMBRES_MESES = {
    "2026-06": "Junio 2026",
    "2026-07": "Julio 2026",
    "2026-08": "Agosto 2026",
    "2026-09": "Septiembre 2026",
    "2026-10": "Octubre 2026",
    "2026-11": "Noviembre 2026",
    "2026-12": "Diciembre 2026"
  };

  function nombreMesLegible(yyyyMm) {
    if (!yyyyMm) return "Octubre 2026";
    if (NOMBRES_MESES[yyyyMm]) return NOMBRES_MESES[yyyyMm];
    const [y, m] = String(yyyyMm).split("-");
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return `${meses[(Number(m) || 1) - 1] || m} ${y}`;
  }

  function fmtUSD(val) {
    const n = Number(val) || 0;
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtVES(val) {
    const n = Number(val) || 0;
    return "Bs " + n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function cambiarMesActivo(nuevoMes) {
    window.FINANZAS_STATE.mesActivo = nuevoMes || "2026-10";
    const sel = document.getElementById("select-mes-activo");
    if (sel && sel.value !== window.FINANZAS_STATE.mesActivo) {
      sel.value = window.FINANZAS_STATE.mesActivo;
    }
    renderAllFinanzas();
  }

  // Cambiar entre Vista Consolidada, Personal, Magia con K y Papel
  function cambiarEntidadActiva(codigo) {
    window.FINANZAS_STATE.entidadActiva = codigo;
    document.querySelectorAll(".entity-pill").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-entity") === codigo);
    });
    renderAllFinanzas();
  }

  function activarTab(tabId) {
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
    });
    document.querySelectorAll(".tab-content").forEach(sec => {
      sec.classList.toggle("active", sec.id === tabId);
    });
    setTimeout(() => renderChartsPersonal(), 60);
  }

  function recalcularTasasManual() {
    const state = window.FINANZAS_STATE;
    const bcv = Number(document.getElementById("input-tasa-bcv")?.value) || 875;
    const binance = Number(document.getElementById("input-tasa-binance")?.value) || 1015;
    const tcmmv = Number(document.getElementById("input-tcmmv")?.value) || 960;

    state.tasas.tasa_bcv = bcv;
    state.tasas.tasa_binance = binance;
    state.tasas.tcmmv_bcv_ves = tcmmv;
    state.tasas.factor_brecha = bcv > 0 ? binance / bcv : 1;
    state.tasas.brecha_pct = bcv > 0 ? ((binance - bcv) / bcv) * 100 : 0;

    renderAllFinanzas();
  }

  // Obtiene las métricas de un mes específico YYYY-MM para Personal, Magia con K y Papel (Sin acumulados globales)
  function calcularMetricasDeUnMes(mesStr) {
    const state = window.FINANZAS_STATE;
    const mes = mesStr || state.mesActivo || "2026-10";

    const txMes = (state.transacciones || []).filter(tx => String(tx.fecha || "").substring(0, 7) === mes);

    const gastoPorCategoria = {};
    const conteoPorCategoria = {};
    state.categorias.forEach(c => {
      gastoPorCategoria[c.codigo] = 0;
      conteoPorCategoria[c.codigo] = 0;
    });

    let ahorroCambiarioMes = 0;
    let desgravamenesMesUsd = 0;
    let gastosHormigaMes = 0;
    let sueldoCobradoMes = 0;

    txMes.forEach(tx => {
      if (tx.entidad_codigo === "PERSONAL") {
        ahorroCambiarioMes += Number(tx.ahorro_cambiario_usd) || 0;
        if (tx.aplica_desgravamen_islr) {
          desgravamenesMesUsd += Number(tx.monto_usd_bcv) || 0;
        }
        if (tx.es_gasto_hormiga) {
          gastosHormigaMes += Number(tx.monto_usd_real) || 0;
        }
        if (tx.tipo_movimiento === "SUELDO_FUNDADOR") {
          sueldoCobradoMes += Number(tx.monto_usd_real) || 0;
        }
        if (
          tx.categoria_codigo &&
          (tx.tipo_movimiento === "GASTO_PERSONAL" ||
           tx.tipo_movimiento === "APORTE_SOBRE" ||
           tx.tipo_movimiento === "GASTO_CRUZADO_NEGOCIO_PAGA_SOCIO")
        ) {
          const montoCat = Number(tx.monto_usd_bcv || tx.monto_usd_real || 0);
          gastoPorCategoria[tx.categoria_codigo] = (gastoPorCategoria[tx.categoria_codigo] || 0) + montoCat;
          conteoPorCategoria[tx.categoria_codigo] = (conteoPorCategoria[tx.categoria_codigo] || 0) + 1;
        }
      }
    });

    // Buscar ventas del mes en Magia con K
    const magiaPorMes = state.tunelLive?.magia_con_k?.por_mes || [];
    const mMesObj = magiaPorMes.find(x => x.mes === mes) || {
      mes,
      ventas_registradas: mes === state.tunelLive?.mes_actual ? (state.tunelLive?.magia_con_k?.ventas_registradas || 0) : 0,
      unidades_vendidas: mes === state.tunelLive?.mes_actual ? (state.tunelLive?.magia_con_k?.unidades_vendidas || 0) : 0,
      ingresos_brutos_usd: mes === state.tunelLive?.mes_actual ? (state.tunelLive?.magia_con_k?.ingresos_brutos_usd || 0) : 0,
      ingresos_brutos_ves: mes === state.tunelLive?.mes_actual ? (state.tunelLive?.magia_con_k?.ingresos_brutos_ves || 0) : 0
    };

    // Buscar ventas y cobranzas del mes en Papel
    const papelPorMes = state.tunelLive?.papel?.por_mes || [];
    const pMesObj = papelPorMes.find(x => x.mes === mes) || {
      mes,
      despachos_count: mes === state.tunelLive?.mes_actual ? (state.tunelLive?.papel?.despachos_count || 0) : 0,
      unidades_despachadas: mes === state.tunelLive?.mes_actual ? (state.tunelLive?.papel?.unidades_despachadas || 0) : 0,
      total_facturado_usd: mes === state.tunelLive?.mes_actual ? (state.tunelLive?.papel?.total_facturado_usd || 0) : 0,
      total_cobrado_usd: mes === state.tunelLive?.mes_actual ? (state.tunelLive?.papel?.total_cobrado_usd || 0) : 0
    };

    let totalPresupuestadoMes = 0;
    let totalEjecutadoMes = 0;
    let gastoBloqueA = 0;

    state.categorias.forEach(c => {
      const p = Number(c.presupuesto_mensual_usd) || 0;
      const g = Number(gastoPorCategoria[c.codigo] || 0);
      totalPresupuestadoMes += p;
      totalEjecutadoMes += g;
      if (c.bloque === "BLOQUE_A_VITALES") gastoBloqueA += p;
    });

    return {
      mes,
      nombreMes: nombreMesLegible(mes),
      txMes,
      gastoPorCategoria,
      conteoPorCategoria,
      totalPresupuestadoMes,
      totalEjecutadoMes,
      gastoBloqueA,
      ahorroCambiarioMes,
      desgravamenesMesUsd,
      gastosHormigaMes,
      sueldoCobradoMes,
      magiaMes: mMesObj,
      papelMes: pMesObj
    };
  }

  // Cálculo de métricas estrictamente mensuales para el mesActivo
  function calcularResumenGlobal() {
    const state = window.FINANZAS_STATE;
    const bcv = state.tasas.tasa_bcv || 875;
    const binance = state.tasas.tasa_binance || 1015;
    const mesActivo = state.mesActivo || "2026-10";

    const metricasMes = calcularMetricasDeUnMes(mesActivo);

    // 1. Liquidez por entidad en USD Reales (USDT)
    let liquidezPersonalOperativa = 0;
    let fondoPazPersonal = 0;
    let sobresPersonalAcumulado = 0;
    let liquidezMagiaOperativa = 0;
    let bovedaFiscalMagia = 0;
    let liquidezPapelOperativa = 0;
    let bovedaFiscalPapel = 0;

    state.billeteras.forEach(w => {
      const saldo = Number(w.saldo_origen) || 0;
      const equivUsdReal = w.moneda === "VES" ? (binance > 0 ? saldo / binance : 0) : saldo;

      if (w.entidad_codigo === "PERSONAL") {
        if (w.tipo_fondo === "FONDO_PAZ_EMERGENCIA") fondoPazPersonal += equivUsdReal;
        else if (w.tipo_fondo === "SOBRES_AHORRO") sobresPersonalAcumulado += equivUsdReal;
        else liquidezPersonalOperativa += equivUsdReal;
      } else if (w.entidad_codigo === "MAGIA_CON_K") {
        if (w.es_intocable_fiscal || w.tipo_fondo === "BOVEDA_FISCAL") bovedaFiscalMagia += equivUsdReal;
        else liquidezMagiaOperativa += equivUsdReal;
      } else if (w.entidad_codigo === "PAPEL") {
        if (w.es_intocable_fiscal || w.tipo_fondo === "BOVEDA_FISCAL") bovedaFiscalPapel += equivUsdReal;
        else liquidezPapelOperativa += equivUsdReal;
      }
    });

    const sueldoMagia = Number(state.entidades.find(e => e.codigo === "MAGIA_CON_K")?.sueldo_fundador_mensual_usd || 350);
    const sueldoPapel = Number(state.entidades.find(e => e.codigo === "PAPEL")?.sueldo_fundador_mensual_usd || 250);
    const ingresoPersonalMeta = sueldoMagia + sueldoPapel;

    // Cruces Patrimoniales pendientes del mes
    let magiaDebeASocio = 0;
    let papelDebeASocio = 0;
    let socioDebeANegocios = 0;

    state.crucesPatrimoniales.forEach(cr => {
      if (cr.estado !== "PENDIENTE") return;
      const m = Number(cr.monto_usd_real) || 0;
      if (cr.direccion === "SOCIO_PRESTA_A_NEGOCIO") {
        if (cr.emprendimiento_codigo === "MAGIA_CON_K") magiaDebeASocio += m;
        if (cr.emprendimiento_codigo === "PAPEL") papelDebeASocio += m;
      } else {
        socioDebeANegocios += m;
      }
    });

    const runwayMeses = metricasMes.gastoBloqueA > 0 ? (fondoPazPersonal / metricasMes.gastoBloqueA) : 0;

    return {
      mesActivo,
      nombreMesActivo: metricasMes.nombreMes,
      bcv,
      binance,
      liquidezPersonalOperativa,
      fondoPazPersonal,
      sobresPersonalAcumulado,
      liquidezMagiaOperativa,
      bovedaFiscalMagia,
      liquidezPapelOperativa,
      bovedaFiscalPapel,
      sueldoMagia,
      sueldoPapel,
      ingresoPersonalMeta,
      totalPresupuestadoPersonal: metricasMes.totalPresupuestadoMes,
      totalEjecutadoPersonal: metricasMes.totalEjecutadoMes,
      gastoPorCategoria: metricasMes.gastoPorCategoria,
      conteoPorCategoria: metricasMes.conteoPorCategoria,
      txMes: metricasMes.txMes,
      magiaMes: metricasMes.magiaMes,
      papelMes: metricasMes.papelMes,
      gastoBloqueA: metricasMes.gastoBloqueA,
      runwayMeses,
      magiaDebeASocio,
      papelDebeASocio,
      socioDebeANegocios,
      saldoNetoPuenteSocio: (magiaDebeASocio + papelDebeASocio) - socioDebeANegocios,
      ahorroCambiarioMes: metricasMes.ahorroCambiarioMes,
      desgravamenesAcumuladosUsd: metricasMes.desgravamenesMesUsd,
      gastosHormigaMes: metricasMes.gastosHormigaMes
    };
  }

  // Renderizar KPIs superiores 100% MENSUALES (Sin acumulados globales)
  function renderMainKPIs(resumen) {
    const state = window.FINANZAS_STATE;
    const grid = document.getElementById("main-kpi-grid");
    if (!grid) return;

    const headerRate = document.getElementById("header-rate-badge");
    if (headerRate) {
      headerRate.innerText = `BCV: ${resumen.bcv.toFixed(2)} | Binance: ${resumen.binance.toFixed(2)} (+${state.tasas.brecha_pct.toFixed(2)}%)`;
    }
    const badgeBrecha = document.getElementById("badge-brecha-live");
    if (badgeBrecha) {
      badgeBrecha.innerText = `Brecha: +${state.tasas.brecha_pct.toFixed(2)}% (Factor ${state.tasas.factor_brecha.toFixed(3)}x)`;
    }

    const mStock = state.tunelLive?.magia_con_k || {};
    const pStock = state.tunelLive?.papel || {};
    const mMes = resumen.magiaMes || {};
    const pMes = resumen.papelMes || {};
    const disponibleMes = resumen.totalPresupuestadoPersonal - resumen.totalEjecutadoPersonal;
    const pctEjec = Math.round((resumen.totalEjecutadoPersonal / (resumen.totalPresupuestadoPersonal || 1)) * 100);

    if (state.entidadActiva === "PERSONAL") {
      grid.innerHTML = `
        <div class="kpi-card green">
          <div class="kpi-title"><span>Presupuesto Mensual (${resumen.nombreMesActivo})</span> <span class="pill-tag pill-green">Base Cero</span></div>
          <div class="kpi-val" style="color: #34d399;">${fmtUSD(resumen.ingresoPersonalMeta)}<span style="font-size:13px; color:#94a3b8;">/mes</span></div>
          <div class="kpi-sub">🔮 Magia: ${fmtUSD(resumen.sueldoMagia)} + 📄 Papel: ${fmtUSD(resumen.sueldoPapel)}</div>
        </div>
        <div class="kpi-card cyan">
          <div class="kpi-title"><span>Gasto Ejecutado (${resumen.nombreMesActivo})</span> <span>${pctEjec}%</span></div>
          <div class="kpi-val">${fmtUSD(resumen.totalEjecutadoPersonal)} <span style="font-size:14px; color:#94a3b8;">/ ${fmtUSD(resumen.totalPresupuestadoPersonal)}</span></div>
          <div class="kpi-sub">Disponible este mes: <strong style="color:#38bdf8;">${fmtUSD(disponibleMes)}</strong></div>
        </div>
        <div class="kpi-card purple">
          <div class="kpi-title"><span>🏠 Casa + 🛒 Mercado (${resumen.nombreMesActivo})</span></div>
          <div class="kpi-val" style="color: #c084fc;">${fmtUSD((resumen.gastoPorCategoria["PER_CASA"] || 0) + (resumen.gastoPorCategoria["PER_MERCADO"] || 0))}</div>
          <div class="kpi-sub">Casa: ${fmtUSD(resumen.gastoPorCategoria["PER_CASA"] || 0)} | Mercado: ${fmtUSD(resumen.gastoPorCategoria["PER_MERCADO"] || 0)}</div>
        </div>
        <div class="kpi-card amber">
          <div class="kpi-title"><span>Ahorro Cambiario (${resumen.nombreMesActivo})</span></div>
          <div class="kpi-val" style="color: #fbbf24;">+${fmtUSD(resumen.ahorroCambiarioMes)}</div>
          <div class="kpi-sub">Reembolso neto a tu favor de negocios: <strong>${fmtUSD(resumen.saldoNetoPuenteSocio)}</strong></div>
        </div>
      `;
      return;
    }

    if (state.entidadActiva === "MAGIA_CON_K") {
      grid.innerHTML = `
        <div class="kpi-card purple">
          <div class="kpi-title"><span>🔮 Ventas del Mes (${resumen.nombreMesActivo})</span> <span class="pill-tag pill-purple">Mensual</span></div>
          <div class="kpi-val" style="color: #c084fc;">${fmtUSD(mMes.ingresos_brutos_usd)}</div>
          <div class="kpi-sub">${mMes.unidades_vendidas || 0} und vendidas en ${resumen.nombreMesActivo} | ${fmtVES(mMes.ingresos_brutos_ves)}</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-title"><span>Inventario Actual (Físico + Tránsito)</span></div>
          <div class="kpi-val" style="color: #34d399;">${mStock.stock_fisico || 94} <span style="font-size:15px;">físicas</span> + ${mStock.stock_transito || 141} <span style="font-size:15px;">tránsito</span></div>
          <div class="kpi-sub">Costo CIF: ${fmtUSD(mStock.costo_inventario_usd)} | PVP: ${fmtUSD(mStock.pvp_inventario_usd)}</div>
        </div>
        <div class="kpi-card cyan">
          <div class="kpi-title"><span>Alcaldía Estimada del Mes (1.5%)</span></div>
          <div class="kpi-val">${fmtUSD((Number(mMes.ingresos_brutos_usd) || 0) * 0.015)}</div>
          <div class="kpi-sub">Calculado sobre las ventas de ${resumen.nombreMesActivo}</div>
        </div>
        <div class="kpi-card amber">
          <div class="kpi-title"><span>Compromiso Mensual con Socio</span></div>
          <div class="kpi-val" style="color: #fbbf24;">${fmtUSD(resumen.sueldoMagia)}<span style="font-size:13px;">/mes</span></div>
          <div class="kpi-sub">Deuda por gastos cruzados a reembolsar: <strong>${fmtUSD(resumen.magiaDebeASocio)}</strong></div>
        </div>
      `;
      return;
    }

    if (state.entidadActiva === "PAPEL") {
      grid.innerHTML = `
        <div class="kpi-card cyan">
          <div class="kpi-title"><span>📄 Cobranzas del Mes (${resumen.nombreMesActivo})</span> <span class="pill-tag pill-blue">Mensual</span></div>
          <div class="kpi-val" style="color: #38bdf8;">${fmtUSD(pMes.total_cobrado_usd)}</div>
          <div class="kpi-sub">Facturado en ${resumen.nombreMesActivo}: ${fmtUSD(pMes.total_facturado_usd)} (${pMes.unidades_despachadas || 0} rollos en ${pMes.despachos_count || 0} despachos)</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-title"><span>Stock Papel Actual (Vzla + Agua)</span></div>
          <div class="kpi-val" style="color: #34d399;">${pStock.stock_vzla || 125} <span style="font-size:15px;">Vzla</span> + ${pStock.stock_agua || 52} <span style="font-size:15px;">Agua</span></div>
          <div class="kpi-sub">Valor Landed: ${fmtUSD(pStock.valor_stock_landed_usd)} | PVP Vzla: ${fmtUSD(pStock.valor_stock_pvp_usd)}</div>
        </div>
        <div class="kpi-card purple">
          <div class="kpi-title"><span>Alcaldía Estimada del Mes (2.0%)</span></div>
          <div class="kpi-val">${fmtUSD((Number(pMes.total_facturado_usd) || 0) * 0.02)}</div>
          <div class="kpi-sub">Calculado sobre facturación de ${resumen.nombreMesActivo}</div>
        </div>
        <div class="kpi-card amber">
          <div class="kpi-title"><span>Sueldo Socio + Cuenta Puente</span></div>
          <div class="kpi-val" style="color: #fbbf24;">${fmtUSD(resumen.sueldoPapel)}<span style="font-size:13px;">/mes</span></div>
          <div class="kpi-sub">Saldo neto por reembolsar al socio: <strong>${fmtUSD(resumen.papelDebeASocio - resumen.socioDebeANegocios)}</strong></div>
        </div>
      `;
      return;
    }

    // VISTA CONSOLIDADA 100% MENSUAL (SIN ACUMULADOS GLOBALES)
    grid.innerHTML = `
      <div class="kpi-card green">
        <div class="kpi-title">
          <span>👤 Presupuesto Personal (${resumen.nombreMesActivo})</span>
          <span class="pill-tag pill-green">${pctEjec}% Ejecutado</span>
        </div>
        <div class="kpi-val" style="color: #34d399;">${fmtUSD(resumen.totalEjecutadoPersonal)} <span style="font-size:13px; color:#94a3b8;">/ ${fmtUSD(resumen.totalPresupuestadoPersonal)}</span></div>
        <div class="kpi-sub">Disponible para gastar este mes: <strong style="color:#f8fafc;">${fmtUSD(disponibleMes)}</strong></div>
      </div>

      <div class="kpi-card purple">
        <div class="kpi-title">
          <span>🔮 Magia con K (${resumen.nombreMesActivo})</span>
          <span class="pill-tag pill-purple">${mMes.unidades_vendidas || 0} und en el mes</span>
        </div>
        <div class="kpi-val" style="color: #c084fc;">${fmtUSD(mMes.ingresos_brutos_usd)} <span style="font-size:13px; color:#94a3b8;">Ventas Mes</span></div>
        <div class="kpi-sub">${mMes.ventas_registradas || 0} órdenes en ${resumen.nombreMesActivo} | Stock: ${mStock.stock_fisico || 94}u</div>
      </div>

      <div class="kpi-card cyan">
        <div class="kpi-title">
          <span>📄 Papel B2B (${resumen.nombreMesActivo})</span>
          <span class="pill-tag pill-blue">${pMes.unidades_despachadas || 0} rollos en el mes</span>
        </div>
        <div class="kpi-val" style="color: #38bdf8;">${fmtUSD(pMes.total_cobrado_usd)} <span style="font-size:13px; color:#94a3b8;">Cobrado Mes</span></div>
        <div class="kpi-sub">Facturado en ${resumen.nombreMesActivo}: ${fmtUSD(pMes.total_facturado_usd)} (${pMes.despachos_count || 0} despachos)</div>
      </div>

      <div class="kpi-card amber">
        <div class="kpi-title">
          <span>💱 Ahorro Cambiario (${resumen.nombreMesActivo})</span>
          <span class="pill-tag pill-amber">BCV vs USDT</span>
        </div>
        <div class="kpi-val" style="color: #fbbf24;">+${fmtUSD(resumen.ahorroCambiarioMes)} <span style="font-size:13px; color:#94a3b8;">Ganados</span></div>
        <div class="kpi-sub">Por cobrar a negocios (Cruce): <strong style="color:#f8fafc;">+${fmtUSD(resumen.saldoNetoPuenteSocio)}</strong></div>
      </div>
    `;
  }

  // Renderizar Pestaña 1: Presupuesto Mensual Limpio + Evolución Mensual
  function renderTabPersonal(resumen) {
    const state = window.FINANZAS_STATE;
    const strip = document.getElementById("personal-health-strip");
    const blocksContainer = document.getElementById("personal-budget-blocks");
    const badgeBaseCero = document.getElementById("badge-ecuacion-base-cero");
    const tituloTablero = document.getElementById("titulo-tablero-mensual");

    if (tituloTablero) {
      tituloTablero.innerText = `👤 Presupuesto Mensual Personal — ${resumen.nombreMesActivo} (Vista 100% Mensual)`;
    }

    const sinAsignar = resumen.ingresoPersonalMeta - resumen.totalPresupuestadoPersonal;
    if (badgeBaseCero) {
      if (Math.abs(sinAsignar) < 0.05) {
        badgeBaseCero.className = "pill-tag pill-green";
        badgeBaseCero.innerText = "✅ Presupuesto Mensual Base Cero ($0.00 sin misión)";
      } else if (sinAsignar > 0) {
        badgeBaseCero.className = "pill-tag pill-amber";
        badgeBaseCero.innerText = `⚠️ Tienes ${fmtUSD(sinAsignar)}/mes sin asignar`;
      } else {
        badgeBaseCero.className = "pill-tag pill-red";
        badgeBaseCero.innerText = `🔴 Tope mensual excedido en ${fmtUSD(Math.abs(sinAsignar))}`;
      }
    }

    const pctPresupuestoEjecutado = Math.round((resumen.totalEjecutadoPersonal / (resumen.totalPresupuestadoPersonal || 1)) * 100);
    const disponibleMes = resumen.totalPresupuestadoPersonal - resumen.totalEjecutadoPersonal;

    if (strip) {
      strip.innerHTML = `
        <div style="background:#0f172a; border:1px solid var(--border); padding:12px 14px; border-radius:10px;">
          <div style="font-size:11px; color:#94a3b8; font-weight:700;">PRESUPUESTO DEL MES (${resumen.nombreMesActivo.toUpperCase()})</div>
          <div style="font-size:19px; font-weight:800; color:#34d399; margin-top:2px;">${fmtUSD(resumen.totalPresupuestadoPersonal)} / mes</div>
          <div style="font-size:11.5px; color:#cbd5e1;">Sueldo Fundador: Magia ($350) + Papel ($250)</div>
        </div>
        <div style="background:#0f172a; border:1px solid var(--border); padding:12px 14px; border-radius:10px;">
          <div style="font-size:11px; color:#94a3b8; font-weight:700;">GASTO EJECUTADO EN ${resumen.nombreMesActivo.toUpperCase()}</div>
          <div style="font-size:19px; font-weight:800; color:#38bdf8; margin-top:2px;">
            ${fmtUSD(resumen.totalEjecutadoPersonal)} <span style="font-size:12px; color:#94a3b8;">(${pctPresupuestoEjecutado}% del mes)</span>
          </div>
          <div style="font-size:11.5px; color:#cbd5e1;">Basado sólo en movimientos de ${resumen.nombreMesActivo}</div>
        </div>
        <div style="background:#0f172a; border:1px solid var(--border); padding:12px 14px; border-radius:10px;">
          <div style="font-size:11px; color:#94a3b8; font-weight:700;">DISPONIBLE RESTANTE DEL MES</div>
          <div style="font-size:19px; font-weight:800; color:${disponibleMes >= 0 ? "#c084fc" : "#ef4444"}; margin-top:2px;">${fmtUSD(disponibleMes)}</div>
          <div style="font-size:11.5px; color:#cbd5e1;">Equiv. BCV: ${fmtVES(Math.max(0, disponibleMes) * resumen.bcv)}</div>
        </div>
        <div style="background:#0f172a; border:1px solid var(--border); padding:12px 14px; border-radius:10px;">
          <div style="font-size:11px; color:#94a3b8; font-weight:700;">AHORRO CAMBIARIO EN ${resumen.nombreMesActivo.toUpperCase()}</div>
          <div style="font-size:19px; font-weight:800; color:#fbbf24; margin-top:2px;">+${fmtUSD(resumen.ahorroCambiarioMes)}</div>
          <div style="font-size:11.5px; color:#cbd5e1;">Pagando Casa, Escuela y Mercado en Bs a BCV</div>
        </div>
      `;
    }

    if (!blocksContainer) return;

    const definicionBloques = [
      {
        id: "BLOQUE_A_VITALES",
        titulo: `🏠 Pilares Mensuales Vitales (${resumen.nombreMesActivo})`,
        subtitulo: "Casa (incl. Farmatodo), Mercado y Mensualidad Escuela de Hija ($75)",
        color: "#10b981"
      },
      {
        id: "BLOQUE_C_ESTILO_VIDA",
        titulo: `🎡 Esparcimiento y Recreación Familiar (${resumen.nombreMesActivo})`,
        subtitulo: "Salidas familiares de fin de semana, helados, paseos y streaming del mes",
        color: "#f59e0b"
      },
      {
        id: "BLOQUE_B_SOBRES",
        titulo: `🎓 Apartados Mensuales para Cuotas Especiales y Salud (${resumen.nombreMesActivo})`,
        subtitulo: "Cuota mensual apartada en este mes para Cuotas Especiales del Colegio y Salud",
        color: "#38bdf8"
      },
      {
        id: "BLOQUE_D_FUTURO_DEUDAS",
        titulo: `🛡️ Aporte Mensual al Fondo de Paz (${resumen.nombreMesActivo})`,
        subtitulo: "Ahorro mensual separado en USDT durante este mes",
        color: "#a855f7"
      }
    ];

    blocksContainer.innerHTML = definicionBloques.map(bl => {
      const items = state.categorias.filter(c => c.bloque === bl.id);
      const sumPresupuesto = items.reduce((acc, c) => acc + (Number(c.presupuesto_mensual_usd) || 0), 0);
      const sumEjecutado = items.reduce((acc, c) => acc + (Number(resumen.gastoPorCategoria[c.codigo]) || 0), 0);
      const pctBloque = sumPresupuesto > 0 ? Math.round((sumEjecutado / sumPresupuesto) * 100) : 0;

      const itemsHtml = items.map(c => {
        const pres = Number(c.presupuesto_mensual_usd) || 0;
        const gast = Number(resumen.gastoPorCategoria[c.codigo]) || 0;
        const numMovs = Number(resumen.conteoPorCategoria[c.codigo]) || 0;
        const pct = pres > 0 ? Math.min(100, Math.round((gast / pres) * 100)) : 0;
        const disp = Math.max(0, pres - gast);

        let barColor = "#10b981";
        let statusTag = `<span class="pill-tag pill-green">🟢 ${pct}% del mes (${numMovs} movs)</span>`;
        if (pct >= 98) {
          barColor = "#ef4444";
          statusTag = `<span class="pill-tag pill-red">🔴 Tope Mensual (${pct}%)</span>`;
        } else if (pct >= 80) {
          barColor = "#f59e0b";
          statusTag = `<span class="pill-tag pill-amber">🟡 ${pct}% del mes (${numMovs} movs)</span>`;
        }

        const badgeMoneda = c.moneda_optima === "VES_BCV"
          ? `<span class="pill-tag pill-green">Pagar en VES (BCV)</span>`
          : `<span class="pill-tag pill-blue">USDT / USD</span>`;

        const badgeIslr = c.aplica_desgravamen_islr
          ? `<span class="pill-tag pill-purple">🧾 Desgravamen ISLR</span>`
          : "";

        return `
          <div class="budget-item">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; flex-wrap:wrap;">
              <div>
                <strong style="font-size:13.5px; color:#f8fafc;">${c.icono || "📌"} ${c.nombre}</strong>
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">
                  ${badgeMoneda}
                  ${badgeIslr}
                  ${statusTag}
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:14.5px; font-weight:800; color:#f8fafc;">
                  ${fmtUSD(gast)} <span style="color:#94a3b8; font-weight:500;">/ ${fmtUSD(pres)} mes</span>
                </div>
                <div style="font-size:11px; color:#34d399; font-weight:700;">
                  Restante mes: ${fmtUSD(disp)} (${fmtVES(disp * resumen.bcv)})
                </div>
              </div>
            </div>

            <div class="progress-track">
              <div class="progress-fill" style="width:${pct}%; background:${barColor};"></div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; color:#94a3b8; margin-top:4px;">
              <span>${c.notas || ""}</span>
              <button type="button" style="background:none; border:1px solid #475569; color:#cbd5e1; border-radius:6px; padding:2px 8px; font-size:11px; cursor:pointer;" onclick="window.editarTopeCategoriaPrompt('${c.codigo}')">
                ✏️ Tope Mensual
              </button>
            </div>
          </div>
        `;
      }).join("");

      return `
        <div class="budget-block-card" style="border-top: 3px solid ${bl.color};">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <h3 style="font-size:15px; font-weight:800; color:#f8fafc;">${bl.titulo}</h3>
            <span class="pill-tag" style="background:rgba(255,255,255,0.08); color:#f8fafc;">
              Mes: ${fmtUSD(sumEjecutado)} / ${fmtUSD(sumPresupuesto)} (${pctBloque}%)
            </span>
          </div>
          <p style="font-size:12px; color:#94a3b8; margin-bottom:12px;">${bl.subtitulo}</p>
          ${itemsHtml}
        </div>
      `;
    }).join("");

    renderEvolucionMensual();
  }

  // Renderizar Tabla y Gráfico de Resúmenes Mensuales de la Evolución (Mes a Mes)
  function renderEvolucionMensual() {
    const state = window.FINANZAS_STATE;
    const tbody = document.getElementById("tbody-evolucion-mensual");
    if (!tbody) return;

    const mesesLista = ["2026-10", "2026-09", "2026-08", "2026-07", "2026-06"];
    const serieMeses = mesesLista.map(m => calcularMetricasDeUnMes(m));

    tbody.innerHTML = serieMeses.map(item => {
      const esActivo = item.mes === state.mesActivo;
      const gCasa = item.gastoPorCategoria["PER_CASA"] || 0;
      const gMercado = item.gastoPorCategoria["PER_MERCADO"] || 0;
      const gEscuela = (item.gastoPorCategoria["PER_ESCUELA_HIJA"] || 0) + (item.gastoPorCategoria["SOBRE_ESCUELA_CUOTAS"] || 0);
      const gEsparc = item.gastoPorCategoria["PER_ESPARCIMIENTO"] || 0;
      const gSaludPaz = (item.gastoPorCategoria["SOBRE_SALUD_VEHICULO"] || 0) + (item.gastoPorCategoria["FUT_FONDO_PAZ"] || 0);
      const totalGasto = item.totalEjecutadoMes;
      const presupuesto = item.totalPresupuestadoMes || 600;
      const disponible = presupuesto - totalGasto;
      const pct = Math.round((totalGasto / presupuesto) * 100);

      const mVentas = Number(item.magiaMes?.ingresos_brutos_usd) || 0;
      const mUnd = Number(item.magiaMes?.unidades_vendidas) || 0;
      const pCobros = Number(item.papelMes?.total_cobrado_usd) || 0;
      const pRollos = Number(item.papelMes?.unidades_despachadas) || 0;

      return `
        <tr style="${esActivo ? "background: rgba(16, 185, 129, 0.12); border-left: 3px solid #10b981;" : ""}">
          <td>
            <strong style="color:#f8fafc;">${item.nombreMes}</strong>
            ${esActivo ? `<span class="pill-tag pill-green" style="margin-left:4px;">Activo</span>` : ""}
          </td>
          <td style="font-weight:700; color:${gCasa > 0 ? "#f8fafc" : "#64748b"};">${fmtUSD(gCasa)}</td>
          <td style="font-weight:700; color:${gMercado > 0 ? "#f8fafc" : "#64748b"};">${fmtUSD(gMercado)}</td>
          <td style="font-weight:700; color:${gEscuela > 0 ? "#c084fc" : "#64748b"};">${fmtUSD(gEscuela)}</td>
          <td style="font-weight:700; color:${gEsparc > 0 ? "#fbbf24" : "#64748b"};">${fmtUSD(gEsparc)}</td>
          <td style="font-weight:700; color:${gSaludPaz > 0 ? "#38bdf8" : "#64748b"};">${fmtUSD(gSaludPaz)}</td>
          <td>
            <strong style="color:#f8fafc;">${fmtUSD(totalGasto)}</strong>
            <span style="font-size:11px; color:#94a3b8;">(${pct}%)</span>
          </td>
          <td style="font-weight:800; color:${disponible >= 0 ? "#34d399" : "#ef4444"};">
            ${fmtUSD(disponible)}
          </td>
          <td style="color:#c084fc; font-weight:700;">
            ${fmtUSD(mVentas)} <span style="font-size:11px; color:#94a3b8;">(${mUnd}u)</span>
          </td>
          <td style="color:#38bdf8; font-weight:700;">
            ${fmtUSD(pCobros)} <span style="font-size:11px; color:#94a3b8;">(${pRollos}r)</span>
          </td>
          <td>
            <button type="button" class="sync-action-btn" style="padding:4px 10px; font-size:11px; background:${esActivo ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.06)"}; border:1px solid ${esActivo ? "#10b981" : "#475569"}; color:#f8fafc;" onclick="window.cambiarMesActivo('${item.mes}')">
              ${esActivo ? "👁️ Viendo" : "🔍 Ver Mes"}
            </button>
          </td>
        </tr>
      `;
    }).join("");

    // Renderizar Gráfico de Evolución Mensual (Junio -> Octubre)
    const ctxEvo = document.getElementById("chart-evolucion-mensual");
    if (ctxEvo && typeof Chart !== "undefined") {
      const cronologico = [...serieMeses].reverse();
      if (chartEvolucionMensual) chartEvolucionMensual.destroy();
      chartEvolucionMensual = new Chart(ctxEvo, {
        type: "bar",
        data: {
          labels: cronologico.map(x => x.nombreMes),
          datasets: [
            {
              label: "👤 Gasto Personal del Mes ($)",
              data: cronologico.map(x => x.totalEjecutadoMes),
              backgroundColor: "rgba(16, 185, 129, 0.75)",
              borderColor: "#10b981",
              borderWidth: 1
            },
            {
              label: "🔮 Ventas Magia con K del Mes ($)",
              data: cronologico.map(x => Number(x.magiaMes?.ingresos_brutos_usd) || 0),
              backgroundColor: "rgba(168, 85, 247, 0.7)",
              borderColor: "#a855f7",
              borderWidth: 1
            },
            {
              label: "📄 Cobranzas Papel B2B del Mes ($)",
              data: cronologico.map(x => Number(x.papelMes?.total_cobrado_usd) || 0),
              backgroundColor: "rgba(14, 165, 233, 0.7)",
              borderColor: "#0ea5e9",
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: "#cbd5e1" }, grid: { display: false } },
            y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.06)" } }
          },
          plugins: {
            legend: { labels: { color: "#e2e8f0" } }
          }
        }
      });
    }
  }

  // Renderizar Pestaña 2: El Túnel de Emprendimientos (Estrictamente del Mes Seleccionado)
  function renderTabTunel(resumen) {
    const state = window.FINANZAS_STATE;
    const container = document.getElementById("tunel-entities-cards");
    const tbodyCruces = document.getElementById("tbody-cruces-patrimoniales");
    const badgePuente = document.getElementById("badge-balance-puente");

    const mStock = state.tunelLive?.magia_con_k || {};
    const pStock = state.tunelLive?.papel || {};
    const m = resumen.magiaMes || {};
    const p = resumen.papelMes || {};

    if (badgePuente) {
      if (resumen.saldoNetoPuenteSocio > 0) {
        badgePuente.className = "pill-tag pill-green";
        badgePuente.innerText = `A favor de Gabriel (Por cobrar a tus negocios): +${fmtUSD(resumen.saldoNetoPuenteSocio)}`;
      } else if (resumen.saldoNetoPuenteSocio < 0) {
        badgePuente.className = "pill-tag pill-red";
        badgePuente.innerText = `Deuda de Gabriel con los negocios: ${fmtUSD(resumen.saldoNetoPuenteSocio)}`;
      } else {
        badgePuente.className = "pill-tag pill-blue";
        badgePuente.innerText = `Cuenta Puente Conciliada ($0.00)`;
      }
    }

    if (container) {
      container.innerHTML = `
        <!-- Tarjeta 1: MAGIA CON K (MENSUAL) -->
        <div class="budget-block-card" style="border-top: 4px solid #a855f7;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div>
              <h3 style="font-size:16px; font-weight:800; color:#f8fafc;">🔮 Magia con K (${resumen.nombreMesActivo})</h3>
              <span style="font-size:11.5px; color:#c084fc;">Resultados exclusivos del mes seleccionado</span>
            </div>
            <span class="pill-tag pill-purple">Mensual</span>
          </div>

          <div style="background:#0f172a; border:1px solid var(--border); border-radius:10px; padding:12px; margin-bottom:12px; font-size:12.5px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">Ventas en ${resumen.nombreMesActivo}:</span>
              <strong style="color:#f8fafc;">${fmtUSD(m.ingresos_brutos_usd)} (${m.unidades_vendidas || 0} und)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">Facturación en Bs (${resumen.nombreMesActivo}):</span>
              <strong style="color:#cbd5e1;">${fmtVES(m.ingresos_brutos_ves)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">Stock Actual Disponible:</span>
              <strong style="color:#34d399;">${mStock.stock_fisico || 94} fís. + ${mStock.stock_transito || 141} tráns.</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; padding-top:6px; border-top:1px dashed var(--border);">
              <span style="color:#38bdf8;">🏛️ Provisión Alcaldía del Mes (1.5%):</span>
              <strong style="color:#38bdf8;">${fmtUSD((Number(m.ingresos_brutos_usd) || 0) * 0.015)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#fbbf24;">🤝 Deuda con Gabriel (Gastos Cruzados):</span>
              <strong style="color:#fbbf24;">${fmtUSD(resumen.magiaDebeASocio)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding-top:6px; border-top:1px solid var(--border);">
              <span style="color:#6ee7b7; font-weight:700;">💵 Sueldo Fundador Mensual:</span>
              <strong style="color:#34d399; font-size:14px;">${fmtUSD(resumen.sueldoMagia)} / mes</strong>
            </div>
          </div>

          <div style="display:flex; gap:8px;">
            <button type="button" class="sync-action-btn" style="flex:1; justify-content:center; background:rgba(168,85,247,0.2); border:1px solid #a855f7; color:#e9d5ff;" onclick="window.registrarPagoSueldoRapido('MAGIA_CON_K', ${resumen.sueldoMagia})">
              💸 Transferir Sueldo del Mes
            </button>
          </div>
        </div>

        <!-- Tarjeta 2: PAPEL B2B (MENSUAL) -->
        <div class="budget-block-card" style="border-top: 4px solid #0ea5e9;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div>
              <h3 style="font-size:16px; font-weight:800; color:#f8fafc;">📄 Papel B2B (${resumen.nombreMesActivo})</h3>
              <span style="font-size:11.5px; color:#38bdf8;">Resultados exclusivos del mes seleccionado</span>
            </div>
            <span class="pill-tag pill-blue">Mensual</span>
          </div>

          <div style="background:#0f172a; border:1px solid var(--border); border-radius:10px; padding:12px; margin-bottom:12px; font-size:12.5px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">Facturado vs Cobrado (${resumen.nombreMesActivo}):</span>
              <strong style="color:#f8fafc;">${fmtUSD(p.total_facturado_usd)} fact. / <span style="color:#34d399;">${fmtUSD(p.total_cobrado_usd)} cobrado</span></strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">Rollos Despachados en el Mes:</span>
              <strong style="color:#38bdf8;">${p.unidades_despachadas || 0} rollos (${p.despachos_count || 0} despachos)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">Stock Actual (Vzla + Agua):</span>
              <strong>${pStock.stock_vzla || 125} Vzla + ${pStock.stock_agua || 52} Marítimo</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; padding-top:6px; border-top:1px dashed var(--border);">
              <span style="color:#38bdf8;">🏛️ Provisión Alcaldía del Mes (2.0%):</span>
              <strong style="color:#38bdf8;">${fmtUSD((Number(p.total_facturado_usd) || 0) * 0.02)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#fbbf24;">🤝 Saldo Neto Cuenta Puente Socio:</span>
              <strong style="color:#fbbf24;">${fmtUSD(resumen.papelDebeASocio - resumen.socioDebeANegocios)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding-top:6px; border-top:1px solid var(--border);">
              <span style="color:#6ee7b7; font-weight:700;">💵 Sueldo Fundador Mensual:</span>
              <strong style="color:#34d399; font-size:14px;">${fmtUSD(resumen.sueldoPapel)} / mes</strong>
            </div>
          </div>

          <div style="display:flex; gap:8px;">
            <button type="button" class="sync-action-btn" style="flex:1; justify-content:center; background:rgba(14,165,233,0.2); border:1px solid #0ea5e9; color:#bae6fd;" onclick="window.registrarPagoSueldoRapido('PAPEL', ${resumen.sueldoPapel})">
              💸 Transferir Sueldo del Mes
            </button>
          </div>
        </div>

        <!-- Tarjeta 3: BOLSILLO PERSONAL DEL MES -->
        <div class="budget-block-card" style="border-top: 4px solid #10b981;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div>
              <h3 style="font-size:16px; font-weight:800; color:#f8fafc;">👤 Resumen Personal (${resumen.nombreMesActivo})</h3>
              <span style="font-size:11.5px; color:#34d399;">Ejecución mensual por categoría</span>
            </div>
            <span class="pill-tag pill-green">Mensual</span>
          </div>

          <div style="background:#0f172a; border:1px solid var(--border); border-radius:10px; padding:12px; margin-bottom:12px; font-size:12.5px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">Presupuesto Mensual Total:</span>
              <strong style="color:#34d399;">${fmtUSD(resumen.totalPresupuestadoPersonal)} / mes</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">🏠 Casa + 🛒 Mercado (${resumen.nombreMesActivo}):</span>
              <strong>${fmtUSD((resumen.gastoPorCategoria["PER_CASA"] || 0) + (resumen.gastoPorCategoria["PER_MERCADO"] || 0))} / $355.00</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">🎒 Escuela + Cuotas (${resumen.nombreMesActivo}):</span>
              <strong>${fmtUSD((resumen.gastoPorCategoria["PER_ESCUELA_HIJA"] || 0) + (resumen.gastoPorCategoria["SOBRE_ESCUELA_CUOTAS"] || 0))} / $100.00</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">🎡 Esparcimiento (${resumen.nombreMesActivo}):</span>
              <strong>${fmtUSD(resumen.gastoPorCategoria["PER_ESPARCIMIENTO"] || 0)} / $80.00</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; padding-top:6px; border-top:1px dashed var(--border);">
              <span style="color:#38bdf8;">✨ Disponible Restante del Mes:</span>
              <strong style="color:#38bdf8;">${fmtUSD(resumen.totalPresupuestadoPersonal - resumen.totalEjecutadoPersonal)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding-top:6px; border-top:1px solid var(--border);">
              <span style="color:#fbbf24; font-weight:700;">⚡ Por Cobrar a Magia + Papel:</span>
              <strong style="color:#fbbf24; font-size:14px;">+${fmtUSD(resumen.saldoNetoPuenteSocio)}</strong>
            </div>
          </div>

          <div style="font-size:11.5px; color:#94a3b8; line-height:1.4;">
            ✅ Vista 100% enfocada en el mes activo sin mezclar históricos acumulados.
          </div>
        </div>
      `;
    }

    if (tbodyCruces) {
      tbodyCruces.innerHTML = state.crucesPatrimoniales.map(cr => {
        const esAFavorSocio = cr.direccion === "SOCIO_PRESTA_A_NEGOCIO";
        const badgeDir = esAFavorSocio
          ? `<span class="pill-tag pill-green">Socio pagó por el Negocio (+A tu favor)</span>`
          : `<span class="pill-tag pill-amber">Negocio pagó algo Personal (-Descontar a Socio)</span>`;

        const badgeEnt = cr.emprendimiento_codigo === "MAGIA_CON_K"
          ? `<span class="pill-tag pill-purple">🔮 Magia con K</span>`
          : `<span class="pill-tag pill-blue">📄 Papel B2B</span>`;

        const badgeEstado = cr.estado === "PENDIENTE"
          ? `<span class="pill-tag pill-amber">⏳ Pendiente de Reembolso</span>`
          : `<span class="pill-tag pill-green">✅ Conciliado / Reembolsado</span>`;

        const btnAccion = cr.estado === "PENDIENTE"
          ? `<button type="button" class="sync-action-btn" style="background:rgba(16,185,129,0.2); border:1px solid #10b981; color:#34d399; padding:4px 10px; font-size:11.5px;" onclick="window.liquidarCrucePatrimonialCloud('${cr.id}')">
               ✔️ Marcar Reembolsado
             </button>`
          : `<span style="color:#64748b; font-size:11.5px;">Liquidado</span>`;

        return `
          <tr>
            <td>${cr.fecha}</td>
            <td>${badgeEnt}</td>
            <td>${badgeDir}</td>
            <td>
              <strong style="color:#f8fafc;">${cr.concepto}</strong>
              <div style="font-size:11px; color:#94a3b8;">${cr.notas || ""}</div>
            </td>
            <td><span class="pill-tag" style="background:rgba(255,255,255,0.06);">${cr.moneda_origen}</span></td>
            <td style="font-weight:800; color:${esAFavorSocio ? "#34d399" : "#fbbf24"};">
              ${esAFavorSocio ? "+" : "-"}${fmtUSD(cr.monto_usd_real)}
            </td>
            <td style="font-size:11.5px; color:#cbd5e1;">
              ${esAFavorSocio ? "No distorsiona tu presupuesto personal; es Cuenta por Cobrar." : "Se imputó a tu sobre personal y resta de tu próximo reembolso."}
            </td>
            <td>${badgeEstado}</td>
            <td>${btnAccion}</td>
          </tr>
        `;
      }).join("");
    }
  }

  // Renderizar Pestaña 3: Legalidad y Bóveda Fiscal Venezuela
  function renderTabFiscal(resumen) {
    const state = window.FINANZAS_STATE;
    const islrBox = document.getElementById("islr-personal-summary");
    const tbodyFiscal = document.getElementById("tbody-obligaciones-fiscales");
    const badgeBoveda = document.getElementById("badge-boveda-fiscal-total");

    const totalProvisionado = state.obligacionesFiscales.reduce((acc, o) => acc + (Number(o.monto_provisionado_usd) || 0), 0);
    const totalMetaFiscal = state.obligacionesFiscales.reduce((acc, o) => acc + (Number(o.monto_meta_periodo_usd) || 0), 0);

    if (badgeBoveda) {
      badgeBoveda.innerText = `Bóveda Fiscal Reservada: ${fmtUSD(totalProvisionado)} / Meta: ${fmtUSD(totalMetaFiscal)}`;
    }

    // Cálculo de Desgravamen Único (774 UT) vs Desgravámenes Detallados
    const valorUtVes = state.tasas.ut_valor_ves || 9.00;
    const desgravamenUnicoVes = 774 * valorUtVes;
    const desgravamenUnicoUsd = resumen.bcv > 0 ? desgravamenUnicoVes / resumen.bcv : 0;
    const convieneDetallado = resumen.desgravamenesAcumuladosUsd > desgravamenUnicoUsd;

    if (islrBox) {
      islrBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span style="color:#94a3b8;">Opción A — Desgravamen Único de Ley (774 UT):</span>
          <strong>${fmtVES(desgravamenUnicoVes)} (${fmtUSD(desgravamenUnicoUsd)} BCV)</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span style="color:#94a3b8;">Opción B — Tus Desgravámenes Detallados con Factura Fiscal (HCM, Salud, Vivienda):</span>
          <strong style="color:#34d399;">${fmtUSD(resumen.desgravamenesAcumuladosUsd)} (${fmtVES(resumen.desgravamenesAcumuladosUsd * resumen.bcv)})</strong>
        </div>
        <div style="padding-top:8px; border-top:1px dashed var(--border); color:#e2e8f0;">
          💡 <strong>Recomendación SENIAT Persona Natural:</strong> ${convieneDetallado
            ? `Te conviene aplicar <strong>Desgravámenes Detallados (Art. 59 LISLR)</strong> porque tus facturas médicas/HCM/vivienda (${fmtUSD(resumen.desgravamenesAcumuladosUsd)}) superan las 774 UT (${fmtUSD(desgravamenUnicoUsd)}). Conserva las facturas físicas originales.`
            : `Usa el <strong>Desgravamen Único (774 UT)</strong> salvo que acumules más facturas fiscales de HCM, odontología o educación antes del 31 de diciembre.`}
        </div>
      `;
    }

    actualizarSimuladorCambiario();

    if (tbodyFiscal) {
      const listaFiltrada = state.entidadActiva === "TODOS"
        ? state.obligacionesFiscales
        : state.obligacionesFiscales.filter(o => o.entidad_codigo === state.entidadActiva);

      tbodyFiscal.innerHTML = listaFiltrada.map(ob => {
        const badgeEnt = ob.entidad_codigo === "PERSONAL"
          ? `<span class="pill-tag pill-green">👤 Personal</span>`
          : ob.entidad_codigo === "MAGIA_CON_K"
            ? `<span class="pill-tag pill-purple">🔮 Magia con K</span>`
            : `<span class="pill-tag pill-blue">📄 Papel B2B</span>`;

        let badgeEst = `<span class="pill-tag pill-amber">⏳ Provisionando</span>`;
        if (ob.estado === "AL_DIA") badgeEst = `<span class="pill-tag pill-green">✅ Al Día</span>`;
        if (ob.estado === "EXONERADO_RNE") badgeEst = `<span class="pill-tag pill-purple">🛡️ Exonerado RNE</span>`;

        return `
          <tr>
            <td>${badgeEnt}</td>
            <td><strong>${ob.organismo}</strong></td>
            <td>
              <strong style="color:#f8fafc;">${ob.tributo}</strong>
              <div style="font-size:11px; color:#94a3b8;">${ob.notas || ""}</div>
            </td>
            <td>
              <span class="pill-tag" style="background:rgba(255,255,255,0.06);">${ob.frecuencia}</span>
              <div style="font-size:11px; color:#94a3b8; margin-top:3px;">${ob.dia_vencimiento_estimado}</div>
            </td>
            <td style="font-size:12px;">${ob.alicuota_referencia}</td>
            <td style="font-weight:800; color:#38bdf8;">${fmtUSD(ob.monto_provisionado_usd)}</td>
            <td style="color:#cbd5e1;">${fmtUSD(ob.monto_meta_periodo_usd)}</td>
            <td style="font-size:11.5px; color:#fca5a5;">⚠️ ${ob.riesgo_multa_tcmmv}</td>
            <td>${badgeEst}</td>
            <td>
              <button type="button" style="background:none; border:1px solid #475569; color:#cbd5e1; border-radius:6px; padding:4px 8px; font-size:11px; cursor:pointer;" onclick="window.editarProvisionFiscalPrompt('${ob.codigo}')">
                ✏️ Provisión
              </button>
            </td>
          </tr>
        `;
      }).join("");
    }
  }

  // Simulador interactivo de ahorro por pagar en Bs a BCV vs Divisas con 3% IGTF
  function actualizarSimuladorCambiario() {
    const state = window.FINANZAS_STATE;
    const out = document.getElementById("sim-cambiario-output");
    if (!out) return;

    const montoUsdBcv = Number(document.getElementById("sim-monto-factura")?.value) || 100;
    const aplicaIgtf = document.getElementById("sim-aplica-igtf")?.value === "si";

    const bcv = state.tasas.tasa_bcv || 875;
    const binance = state.tasas.tasa_binance || 1015;

    const costoSiPagasEnDivisas = aplicaIgtf ? montoUsdBcv * 1.03 : montoUsdBcv;
    const montoEnBolivares = montoUsdBcv * bcv;
    const usdtNecesariosEnP2P = binance > 0 ? montoEnBolivares / binance : montoUsdBcv;
    const ahorroTotalUsdt = costoSiPagasEnDivisas - usdtNecesariosEnP2P;
    const pctAhorro = costoSiPagasEnDivisas > 0 ? (ahorroTotalUsdt / costoSiPagasEnDivisas) * 100 : 0;

    out.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="color:#94a3b8;">Si pagas en USD Efectivo / Zelle ${aplicaIgtf ? "(+3% IGTF)" : ""}:</span>
        <strong style="color:#f87171;">Gastas ${fmtUSD(costoSiPagasEnDivisas)}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="color:#94a3b8;">Si cambias USDT en P2P y pagas ${fmtVES(montoEnBolivares)} a BCV:</span>
        <strong style="color:#34d399;">Solo desembolsas ${fmtUSD(usdtNecesariosEnP2P)} USDT</strong>
      </div>
      <div style="padding-top:6px; border-top:1px dashed rgba(16,185,129,0.35); color:#6ee7b7; font-weight:700;">
        ✅ Ganancia / Ahorro directo para tu presupuesto: +${fmtUSD(ahorroTotalUsdt)} (${pctAhorro.toFixed(1)}% menos en dólares reales)
      </div>
    `;
  }

  // Renderizar Pestaña 4: Billeteras Separadas y Libro Mayor
  function renderTabLibro(resumen) {
    const state = window.FINANZAS_STATE;
    const walletsContainer = document.getElementById("wallets-grid-container");
    const tbodyTx = document.getElementById("tbody-transacciones");

    if (walletsContainer) {
      const billeterasFiltradas = state.entidadActiva === "TODOS"
        ? state.billeteras
        : state.billeteras.filter(w => w.entidad_codigo === state.entidadActiva);

      walletsContainer.innerHTML = billeterasFiltradas.map(w => {
        const saldo = Number(w.saldo_origen) || 0;
        const esVes = w.moneda === "VES";
        const equivUsdt = esVes ? (resumen.binance > 0 ? saldo / resumen.binance : 0) : saldo;

        const badgeEnt = w.entidad_codigo === "PERSONAL"
          ? `<span class="pill-tag pill-green">👤 Personal</span>`
          : w.entidad_codigo === "MAGIA_CON_K"
            ? `<span class="pill-tag pill-purple">🔮 Magia con K</span>`
            : `<span class="pill-tag pill-blue">📄 Papel B2B</span>`;

        const alertaDevaluacion = (esVes && equivUsdt > 120)
          ? `<div style="margin-top:8px; font-size:11px; color:#fbbf24; background:rgba(245,158,11,0.12); padding:6px 8px; border-radius:6px;">
               ⚠️ Alerta Anti-Devaluación: Tienes más de $120 en Bs. Convierte el excedente a USDT sino vas a pagar hoy.
             </div>`
          : "";

        return `
          <div class="budget-block-card" style="margin-bottom:0; border-left: 4px solid ${w.es_intocable_fiscal ? "#38bdf8" : "#10b981"};">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              ${badgeEnt}
              <span class="pill-tag" style="background:rgba(255,255,255,0.06);">${w.moneda} &bull; ${w.tipo_fondo}</span>
            </div>
            <div style="font-size:14px; font-weight:800; color:#f8fafc; margin-bottom:4px;">${w.nombre}</div>
            <div style="font-size:20px; font-weight:800; color:${w.es_intocable_fiscal ? "#38bdf8" : "#34d399"};">
              ${esVes ? fmtVES(saldo) : fmtUSD(saldo)}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
              <div style="font-size:11.5px; color:#94a3b8;">
                Poder adquisitivo real: <strong>${fmtUSD(equivUsdt)} USDT</strong>
                ${w.es_intocable_fiscal ? " &bull; 🔒 Fiscal" : ""}
              </div>
              <button type="button" style="background:none; border:1px solid #475569; color:#cbd5e1; border-radius:6px; padding:3px 8px; font-size:11px; cursor:pointer;" onclick="window.editarSaldoBilleteraPrompt('${w.nombre.replace(/'/g, "\\'")}')">
                ✏️ Llenar Saldo
              </button>
            </div>
            ${alertaDevaluacion}
          </div>
        `;
      }).join("");
    }

    if (tbodyTx) {
      const txMes = state.transacciones.filter(t => String(t.fecha || "").substring(0, 7) === resumen.mesActivo);
      const txFiltradas = state.entidadActiva === "TODOS"
        ? txMes
        : txMes.filter(t => t.entidad_codigo === state.entidadActiva || t.entidad_pagadora_cruce === state.entidadActiva);

      tbodyTx.innerHTML = txFiltradas.map(tx => {
        const badgeEnt = tx.entidad_codigo === "PERSONAL"
          ? `<span class="pill-tag pill-green">👤 Personal</span>`
          : tx.entidad_codigo === "MAGIA_CON_K"
            ? `<span class="pill-tag pill-purple">🔮 Magia con K</span>`
            : `<span class="pill-tag pill-blue">📄 Papel B2B</span>`;

        const esIngreso = tx.tipo_movimiento === "SUELDO_FUNDADOR" || tx.tipo_movimiento === "INGRESO_PERSONAL" || tx.tipo_movimiento === "INGRESO_NEGOCIO";
        const montoOrigenStr = tx.moneda_origen === "VES" ? fmtVES(tx.monto_origen) : `${fmtUSD(tx.monto_origen)} (${tx.moneda_origen})`;

        const tagsFiscales = [];
        if (tx.tiene_factura_fiscal) tagsFiscales.push(`<span class="pill-tag pill-blue">🧾 Factura Fiscal</span>`);
        if (tx.aplica_desgravamen_islr) tagsFiscales.push(`<span class="pill-tag pill-purple">🏥 Desgravamen ISLR</span>`);
        if (tx.es_gasto_hormiga) tagsFiscales.push(`<span class="pill-tag pill-amber">🐜 Hormiga</span>`);
        if (tx.es_bolsillo_cruzado) tagsFiscales.push(`<span class="pill-tag pill-amber">⚡ Bolsillo Cruzado (${tx.entidad_pagadora_cruce || ""})</span>`);

        return `
          <tr>
            <td>${tx.fecha}</td>
            <td>${badgeEnt}</td>
            <td style="font-size:12px; font-weight:700;">${tx.tipo_movimiento.replace(/_/g, " ")}</td>
            <td>
              <strong style="color:#f8fafc;">${tx.concepto}</strong>
              ${tx.categoria_codigo ? `<div style="font-size:11px; color:#94a3b8;">Categoría: ${tx.categoria_codigo}</div>` : ""}
            </td>
            <td style="font-weight:700;">${montoOrigenStr}</td>
            <td>${fmtUSD(tx.monto_usd_bcv)}</td>
            <td style="font-weight:800; color:${esIngreso ? "#34d399" : "#f8fafc"};">
              ${esIngreso ? "+" : "-"}${fmtUSD(tx.monto_usd_real)}
            </td>
            <td style="color:#34d399; font-weight:700;">
              ${Number(tx.ahorro_cambiario_usd) > 0 ? `+${fmtUSD(tx.ahorro_cambiario_usd)}` : "—"}
            </td>
            <td>${tagsFiscales.join(" ") || "<span style='color:#64748b;'>Estándar</span>"}</td>
          </tr>
        `;
      }).join("");
    }
  }

  // Gráficos Chart.js para Pestaña 1 (Presupuesto Personal)
  function renderChartsPersonal(resumen) {
    if (typeof Chart === "undefined") return;
    const state = window.FINANZAS_STATE;
    const gastoMap = (resumen && resumen.gastoPorCategoria) ? resumen.gastoPorCategoria : {};

    const ctxBloques = document.getElementById("chart-bloques-personal");
    const ctxEjec = document.getElementById("chart-ejecucion-categorias");
    if (!ctxBloques || !ctxEjec) return;

    const bloquesMap = {
      BLOQUE_A_VITALES: { label: "A: Vitales y Fijos", sum: 0, color: "#10b981" },
      BLOQUE_B_SOBRES: { label: "B: Sobres Anuales", sum: 0, color: "#38bdf8" },
      BLOQUE_C_ESTILO_VIDA: { label: "C: Estilo de Vida", sum: 0, color: "#f59e0b" },
      BLOQUE_D_FUTURO_DEUDAS: { label: "D: Fondo Paz & Futuro", sum: 0, color: "#a855f7" }
    };

    state.categorias.forEach(c => {
      if (bloquesMap[c.bloque]) {
        bloquesMap[c.bloque].sum += Number(c.presupuesto_mensual_usd) || 0;
      }
    });

    if (chartBloques) chartBloques.destroy();
    chartBloques = new Chart(ctxBloques, {
      type: "doughnut",
      data: {
        labels: Object.values(bloquesMap).map(b => b.label),
        datasets: [{
          data: Object.values(bloquesMap).map(b => b.sum),
          backgroundColor: Object.values(bloquesMap).map(b => b.color),
          borderColor: "#1e293b",
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "right", labels: { color: "#cbd5e1", font: { size: 12 } } }
        }
      }
    });

    const topCats = state.categorias.slice(0, 8);
    if (chartEjecucion) chartEjecucion.destroy();
    chartEjecucion = new Chart(ctxEjec, {
      type: "bar",
      data: {
        labels: topCats.map(c => c.nombre.substring(0, 18)),
        datasets: [
          {
            label: "Presupuesto ($)",
            data: topCats.map(c => Number(c.presupuesto_mensual_usd) || 0),
            backgroundColor: "rgba(99, 102, 241, 0.35)",
            borderColor: "#6366f1",
            borderWidth: 1
          },
          {
            label: "Ejecutado Mes ($)",
            data: topCats.map(c => Number(gastoMap[c.codigo]) || 0),
            backgroundColor: "rgba(16, 185, 129, 0.7)",
            borderColor: "#10b981",
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: "#94a3b8", font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.06)" } }
        },
        plugins: {
          legend: { labels: { color: "#cbd5e1" } }
        }
      }
    });
  }

  // Modal de Nuevo Movimiento / Cruce Patrimonial
  function openNuevoMovimientoModal(tipoDefecto = "GASTO_PERSONAL") {
    const modal = document.getElementById("modal-nuevo-movimiento");
    if (!modal) return;

    const fechaInput = document.getElementById("mov-fecha");
    if (fechaInput) fechaInput.value = new Date().toISOString().split("T")[0];

    const tipoSelect = document.getElementById("mov-tipo");
    if (tipoSelect && tipoDefecto) tipoSelect.value = tipoDefecto;

    const catSelect = document.getElementById("mov-categoria");
    if (catSelect) {
      catSelect.innerHTML = window.FINANZAS_STATE.categorias.map(c =>
        `<option value="${c.codigo}">${c.icono || "📌"} ${c.nombre} (Tope: $${Number(c.presupuesto_mensual_usd).toFixed(0)})</option>`
      ).join("");
    }

    actualizarCamposModalMovimiento();
    previsualizarConversionModal();
    modal.classList.add("open");
  }

  function closeNuevoMovimientoModal() {
    const modal = document.getElementById("modal-nuevo-movimiento");
    if (modal) modal.classList.remove("open");
  }

  function actualizarCamposModalMovimiento() {
    const tipo = document.getElementById("mov-tipo")?.value || "GASTO_PERSONAL";
    const groupCat = document.getElementById("group-mov-categoria");
    const groupCruce = document.getElementById("group-cruce-entidad");
    const entSelect = document.getElementById("mov-entidad");

    const esCruce = tipo === "GASTO_CRUZADO_SOCIO_PAGA_NEGOCIO" || tipo === "GASTO_CRUZADO_NEGOCIO_PAGA_SOCIO";
    if (groupCruce) groupCruce.style.display = esCruce ? "block" : "none";

    const usaCategoriaPersonal = tipo === "GASTO_PERSONAL" || tipo === "APORTE_SOBRE" || tipo === "GASTO_CRUZADO_NEGOCIO_PAGA_SOCIO";
    if (groupCat) groupCat.style.display = usaCategoriaPersonal ? "block" : "none";

    if (entSelect) {
      if (tipo === "GASTO_PERSONAL" || tipo === "APORTE_SOBRE" || tipo === "SUELDO_FUNDADOR" || tipo === "GASTO_CRUZADO_NEGOCIO_PAGA_SOCIO") {
        entSelect.value = "PERSONAL";
      } else if (tipo === "GASTO_CRUZADO_SOCIO_PAGA_NEGOCIO") {
        entSelect.value = document.getElementById("mov-entidad-cruce")?.value || "MAGIA_CON_K";
      }
    }
  }

  function previsualizarConversionModal() {
    const state = window.FINANZAS_STATE;
    const moneda = document.getElementById("mov-moneda")?.value || "VES";
    const monto = Number(document.getElementById("mov-monto")?.value) || 0;
    const preview = document.getElementById("mov-preview-bimonetario");
    if (!preview) return;

    const bcv = state.tasas.tasa_bcv || 875;
    const binance = state.tasas.tasa_binance || 1015;

    if (monto <= 0) {
      preview.innerHTML = "Ingresa un monto para calcular su equivalencia a Tasa BCV y en USDT reales.";
      return;
    }

    if (moneda === "VES") {
      const usdBcv = bcv > 0 ? monto / bcv : 0;
      const usdReal = binance > 0 ? monto / binance : 0;
      const ahorro = Math.max(0, usdBcv - usdReal);
      preview.innerHTML = `
        <div style="display:flex; justify-content:space-between;">
          <span>Equivalente Oficial BCV (${bcv} Bs/$):</span>
          <strong>${fmtUSD(usdBcv)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:4px;">
          <span>Costo Real en Poder Adquisitivo USDT (${binance} Bs/USDT):</span>
          <strong style="color:#38bdf8;">${fmtUSD(usdReal)} USDT</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:4px; color:#34d399; font-weight:700;">
          <span>✨ Ahorro Cambiario Ganado por pagar en Bs:</span>
          <span>+${fmtUSD(ahorro)}</span>
        </div>
      `;
    } else {
      preview.innerHTML = `
        <div style="display:flex; justify-content:space-between;">
          <span>Monto Directo en Divisa / USDT:</span>
          <strong style="color:#38bdf8;">${fmtUSD(monto)} (${moneda})</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:4px; color:#94a3b8;">
          <span>Equivalente Contable en Libros BCV:</span>
          <span>${fmtVES(monto * bcv)}</span>
        </div>
      `;
    }
  }

  async function handleGuardarMovimiento(e) {
    e.preventDefault();
    const state = window.FINANZAS_STATE;
    const bcv = state.tasas.tasa_bcv || 875;
    const binance = state.tasas.tasa_binance || 1015;

    const fecha = document.getElementById("mov-fecha")?.value || new Date().toISOString().split("T")[0];
    const tipo = document.getElementById("mov-tipo")?.value || "GASTO_PERSONAL";
    const entidad = document.getElementById("mov-entidad")?.value || "PERSONAL";
    const categoria = document.getElementById("mov-categoria")?.value || null;
    const entidadCruce = document.getElementById("mov-entidad-cruce")?.value || "MAGIA_CON_K";
    const concepto = (document.getElementById("mov-concepto")?.value || "").trim();
    const moneda = document.getElementById("mov-moneda")?.value || "VES";
    const montoOrigen = Number(document.getElementById("mov-monto")?.value) || 0;

    const tieneFactura = Boolean(document.getElementById("mov-factura-fiscal")?.checked);
    const aplicaDesgravamen = Boolean(document.getElementById("mov-desgravamen-islr")?.checked);
    const esHormiga = Boolean(document.getElementById("mov-gasto-hormiga")?.checked);

    const usdBcv = moneda === "VES" ? (bcv > 0 ? Number((montoOrigen / bcv).toFixed(2)) : 0) : montoOrigen;
    const usdReal = moneda === "VES" ? (binance > 0 ? Number((montoOrigen / binance).toFixed(2)) : 0) : montoOrigen;
    const ahorro = moneda === "VES" ? Number(Math.max(0, usdBcv - usdReal).toFixed(2)) : 0;

    const esCruce = tipo === "GASTO_CRUZADO_SOCIO_PAGA_NEGOCIO" || tipo === "GASTO_CRUZADO_NEGOCIO_PAGA_SOCIO";
    const usaCat = tipo === "GASTO_PERSONAL" || tipo === "APORTE_SOBRE" || tipo === "GASTO_CRUZADO_NEGOCIO_PAGA_SOCIO";

    const txPayload = {
      fecha,
      entidad_codigo: tipo === "GASTO_CRUZADO_SOCIO_PAGA_NEGOCIO" ? entidadCruce : entidad,
      tipo_movimiento: tipo,
      categoria_codigo: usaCat ? categoria : null,
      concepto,
      moneda_origen: moneda,
      monto_origen: montoOrigen,
      tasa_bcv: bcv,
      tasa_binance: binance,
      monto_usd_bcv: usdBcv,
      monto_usd_real: usdReal,
      ahorro_cambiario_usd: ahorro,
      tiene_factura_fiscal: tieneFactura,
      aplica_desgravamen_islr: aplicaDesgravamen,
      es_gasto_hormiga: esHormiga,
      es_bolsillo_cruzado: esCruce,
      entidad_pagadora_cruce: esCruce ? (tipo === "GASTO_CRUZADO_SOCIO_PAGA_NEGOCIO" ? "PERSONAL" : entidadCruce) : null
    };

    let crucePayload = null;
    if (esCruce) {
      crucePayload = {
        id: "cr-" + Date.now(),
        fecha,
        emprendimiento_codigo: entidadCruce,
        direccion: tipo === "GASTO_CRUZADO_SOCIO_PAGA_NEGOCIO" ? "SOCIO_PRESTA_A_NEGOCIO" : "NEGOCIO_ADELANTA_A_SOCIO",
        concepto,
        monto_usd_real: usdReal,
        moneda_origen: moneda,
        estado: "PENDIENTE",
        notas: tipo === "GASTO_CRUZADO_SOCIO_PAGA_NEGOCIO"
          ? `Pagado con bolsillo Personal de Gabriel. ${entidadCruce} debe reembolsar $${usdReal.toFixed(2)}.`
          : `Pagado con caja de ${entidadCruce}. Descontado del presupuesto personal de Gabriel.`
      };
    }

    closeNuevoMovimientoModal();
    if (typeof window.guardarTransaccionCloud === "function") {
      await window.guardarTransaccionCloud(txPayload, crucePayload);
    }
  }

  // Botón rápido para registrar el pago mensual/quincenal de Sueldo de Fundador
  async function registrarPagoSueldoRapido(emprendimientoCodigo, montoSugerido) {
    const montoStr = prompt(`¿Cuánto deseas transferir hoy de Sueldo de Fundador desde ${emprendimientoCodigo} a tu Bolsillo Personal (USD / USDT)?`, String(montoSugerido));
    if (!montoStr) return;
    const monto = Number(montoStr);
    if (isNaN(monto) || monto <= 0) return;

    const state = window.FINANZAS_STATE;
    const txPayload = {
      fecha: new Date().toISOString().split("T")[0],
      entidad_codigo: "PERSONAL",
      tipo_movimiento: "SUELDO_FUNDADOR",
      categoria_codigo: null,
      concepto: `Cobro Sueldo Fundador — Transferido desde ${emprendimientoCodigo}`,
      moneda_origen: "USDT",
      monto_origen: monto,
      tasa_bcv: state.tasas.tasa_bcv || 875,
      tasa_binance: state.tasas.tasa_binance || 1015,
      monto_usd_bcv: monto,
      monto_usd_real: monto,
      ahorro_cambiario_usd: 0,
      tiene_factura_fiscal: false,
      aplica_desgravamen_islr: false,
      es_gasto_hormiga: false,
      es_bolsillo_cruzado: false,
      entidad_pagadora_cruce: emprendimientoCodigo
    };

    if (typeof window.guardarTransaccionCloud === "function") {
      await window.guardarTransaccionCloud(txPayload, null);
    }
  }

  function editarTopeCategoriaPrompt(codigo) {
    const cat = window.FINANZAS_STATE.categorias.find(c => c.codigo === codigo);
    if (!cat) return;
    const nuevo = prompt(`Nuevo presupuesto mensual en USD para "${cat.nombre}":`, String(cat.presupuesto_mensual_usd));
    if (nuevo === null) return;
    const val = Number(nuevo);
    if (isNaN(val) || val < 0) return;
    if (typeof window.actualizarTopeCategoriaCloud === "function") {
      window.actualizarTopeCategoriaCloud(codigo, val, cat.meta_sobre_total_usd);
    }
  }

  function editarProvisionFiscalPrompt(codigo) {
    const ob = window.FINANZAS_STATE.obligacionesFiscales.find(o => o.codigo === codigo);
    if (!ob) return;
    const nuevo = prompt(`Monto actual reservado en Bóveda Fiscal (USD) para "${ob.tributo}" (Meta: $${ob.monto_meta_periodo_usd}):`, String(ob.monto_provisionado_usd));
    if (nuevo === null) return;
    const val = Number(nuevo);
    if (isNaN(val) || val < 0) return;
    if (typeof window.actualizarProvisionFiscalCloud === "function") {
      window.actualizarProvisionFiscalCloud(codigo, val);
    }
  }

  function editarSaldoBilleteraPrompt(nombreBilletera) {
    const w = window.FINANZAS_STATE.billeteras.find(b => b.nombre === nombreBilletera);
    if (!w) return;
    const nuevo = prompt(`Ingresa el saldo actual en ${w.moneda} para "${w.nombre}":`, String(w.saldo_origen || 0));
    if (nuevo === null) return;
    const val = Number(nuevo);
    if (isNaN(val) || val < 0) return;
    if (typeof window.actualizarSaldoBilleteraCloud === "function") {
      window.actualizarSaldoBilleteraCloud(nombreBilletera, val);
    }
  }

  function renderAllFinanzas() {
    const resumen = calcularResumenGlobal();
    renderMainKPIs(resumen);
    renderTabPersonal(resumen);
    renderTabTunel(resumen);
    renderTabFiscal(resumen);
    renderTabLibro(resumen);
    renderChartsPersonal(resumen);
    if (typeof window.renderTablaGmailFacturas === "function") {
      window.renderTablaGmailFacturas();
    }
  }

  // Exponer funciones globales
  window.renderAllFinanzas = renderAllFinanzas;
  window.cambiarEntidadActiva = cambiarEntidadActiva;
  window.cambiarMesActivo = cambiarMesActivo;
  window.activarTab = activarTab;
  window.recalcularTasasManual = recalcularTasasManual;
  window.actualizarSimuladorCambiario = actualizarSimuladorCambiario;
  window.openNuevoMovimientoModal = openNuevoMovimientoModal;
  window.closeNuevoMovimientoModal = closeNuevoMovimientoModal;
  window.actualizarCamposModalMovimiento = actualizarCamposModalMovimiento;
  window.previsualizarConversionModal = previsualizarConversionModal;
  window.handleGuardarMovimiento = handleGuardarMovimiento;
  window.registrarPagoSueldoRapido = registrarPagoSueldoRapido;
  window.editarTopeCategoriaPrompt = editarTopeCategoriaPrompt;
  window.editarProvisionFiscalPrompt = editarProvisionFiscalPrompt;
  window.editarSaldoBilleteraPrompt = editarSaldoBilleteraPrompt;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAllFinanzas);
  } else {
    renderAllFinanzas();
  }
})();
