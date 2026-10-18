// ==============================================================================
// MOTOR PRINCIPAL DE FINANZAS PERSONALES, SEPARACIÓN DE EMPRENDIMIENTOS Y TRIBUTOS VE
// Implementa la Skill: experto-presupuesto-y-finanzas-ve
// ==============================================================================

(function () {
  "use strict";

  let chartBloques = null;
  let chartEjecucion = null;

  function fmtUSD(val) {
    const n = Number(val) || 0;
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtVES(val) {
    const n = Number(val) || 0;
    return "Bs " + n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Cambiar entre Vista Consolidada, Personal, Magia con K y Papel
  function cambiarEntidadActiva(codigo) {
    window.FINANZAS_STATE.entidadActiva = codigo;
    document.querySelectorAll(".entity-pill").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-entity") === codigo);
    });

    // Si selecciona Personal, llevar a pestaña Personal; si selecciona un emprendimiento, mostrar su resumen o filtrar
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

  // Cálculo de métricas consolidadas y por entidad
  function calcularResumenGlobal() {
    const state = window.FINANZAS_STATE;
    const bcv = state.tasas.tasa_bcv || 875;
    const binance = state.tasas.tasa_binance || 1015;

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

    // 2. Presupuesto Personal Base Cero
    const sueldoMagia = Number(state.entidades.find(e => e.codigo === "MAGIA_CON_K")?.sueldo_fundador_mensual_usd || 350);
    const sueldoPapel = Number(state.entidades.find(e => e.codigo === "PAPEL")?.sueldo_fundador_mensual_usd || 250);
    const ingresoPersonalMeta = sueldoMagia + sueldoPapel;

    let totalPresupuestadoPersonal = 0;
    let totalEjecutadoPersonal = 0;
    let gastoBloqueA = 0;

    state.categorias.forEach(c => {
      const p = Number(c.presupuesto_mensual_usd) || 0;
      const g = Number(c.gasto_acumulado_mes_usd) || 0;
      totalPresupuestadoPersonal += p;
      totalEjecutadoPersonal += g;
      if (c.bloque === "BLOQUE_A_VITALES") gastoBloqueA += p;
    });

    // 3. Cruces Patrimoniales pendientes
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

    // 4. Ahorro cambiario acumulado y desgravámenes
    let ahorroCambiarioMes = 0;
    let desgravamenesAcumuladosUsd = 0;
    let gastosHormigaMes = 0;

    state.transacciones.forEach(tx => {
      ahorroCambiarioMes += Number(tx.ahorro_cambiario_usd) || 0;
      if (tx.aplica_desgravamen_islr) {
        desgravamenesAcumuladosUsd += Number(tx.monto_usd_bcv) || 0;
      }
      if (tx.es_gasto_hormiga || tx.categoria_codigo === "PER_HORMIGA") {
        gastosHormigaMes += Number(tx.monto_usd_real) || 0;
      }
    });

    const catHormiga = state.categorias.find(c => c.codigo === "PER_HORMIGA");
    if (catHormiga && Number(catHormiga.gasto_acumulado_mes_usd) > gastosHormigaMes) {
      gastosHormigaMes = Number(catHormiga.gasto_acumulado_mes_usd);
    }

    const runwayMeses = gastoBloqueA > 0 ? (fondoPazPersonal / gastoBloqueA) : 0;

    return {
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
      totalPresupuestadoPersonal,
      totalEjecutadoPersonal,
      gastoBloqueA,
      runwayMeses,
      magiaDebeASocio,
      papelDebeASocio,
      socioDebeANegocios,
      saldoNetoPuenteSocio: (magiaDebeASocio + papelDebeASocio) - socioDebeANegocios,
      ahorroCambiarioMes,
      desgravamenesAcumuladosUsd,
      gastosHormigaMes
    };
  }

  // Renderizar KPIs superiores según el bolsillo seleccionado
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

    const mLive = state.tunelLive?.magia_con_k || {};
    const pLive = state.tunelLive?.papel || {};

    if (state.entidadActiva === "PERSONAL") {
      const disponibleMes = resumen.totalPresupuestadoPersonal - resumen.totalEjecutadoPersonal;
      grid.innerHTML = `
        <div class="kpi-card green">
          <div class="kpi-title"><span>Sueldo Fundador Mensual</span> <span class="pill-tag pill-green">Ingreso Fijo</span></div>
          <div class="kpi-val" style="color: #34d399;">${fmtUSD(resumen.ingresoPersonalMeta)}</div>
          <div class="kpi-sub">🔮 Magia: ${fmtUSD(resumen.sueldoMagia)} + 📄 Papel: ${fmtUSD(resumen.sueldoPapel)}</div>
        </div>
        <div class="kpi-card cyan">
          <div class="kpi-title"><span>Presupuesto Personal Ejecutado</span> <span>${Math.round((resumen.totalEjecutadoPersonal / (resumen.totalPresupuestadoPersonal || 1)) * 100)}%</span></div>
          <div class="kpi-val">${fmtUSD(resumen.totalEjecutadoPersonal)} <span style="font-size:14px; color:#94a3b8;">/ ${fmtUSD(resumen.totalPresupuestadoPersonal)}</span></div>
          <div class="kpi-sub">Restante por ejecutar este mes: <strong style="color:#38bdf8;">${fmtUSD(disponibleMes)}</strong></div>
        </div>
        <div class="kpi-card purple">
          <div class="kpi-title"><span>Fondo de Paz + Sobres Personales</span> <span class="pill-tag pill-purple">${resumen.runwayMeses.toFixed(1)} meses</span></div>
          <div class="kpi-val" style="color: #c084fc;">${fmtUSD(resumen.fondoPazPersonal + resumen.sobresPersonalAcumulado)}</div>
          <div class="kpi-sub">Emergencia: ${fmtUSD(resumen.fondoPazPersonal)} | Sobres: ${fmtUSD(resumen.sobresPersonalAcumulado)}</div>
        </div>
        <div class="kpi-card amber">
          <div class="kpi-title"><span>Ahorro Cambiario + Cuenta Puente</span></div>
          <div class="kpi-val" style="color: #fbbf24;">+${fmtUSD(resumen.ahorroCambiarioMes)}</div>
          <div class="kpi-sub">Reembolso neto a tu favor de negocios: <strong>${fmtUSD(resumen.saldoNetoPuenteSocio)}</strong></div>
        </div>
      `;
      return;
    }

    if (state.entidadActiva === "MAGIA_CON_K") {
      grid.innerHTML = `
        <div class="kpi-card purple">
          <div class="kpi-title"><span>🔮 Ventas Reales Magia con K</span> <span class="pill-tag pill-purple">Túnel Live</span></div>
          <div class="kpi-val" style="color: #c084fc;">${fmtUSD(mLive.ingresos_brutos_usd)}</div>
          <div class="kpi-sub">${mLive.unidades_vendidas || 136} und vendidas | ${fmtVES(mLive.ingresos_brutos_ves)}</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-title"><span>Inventario Magia (Físico + Tránsito)</span></div>
          <div class="kpi-val" style="color: #34d399;">${mLive.stock_fisico || 94} <span style="font-size:15px;">físicas</span> + ${mLive.stock_transito || 141} <span style="font-size:15px;">tránsito</span></div>
          <div class="kpi-sub">Costo CIF: ${fmtUSD(mLive.costo_inventario_usd)} | PVP: ${fmtUSD(mLive.pvp_inventario_usd)}</div>
        </div>
        <div class="kpi-card cyan">
          <div class="kpi-title"><span>Liquidez Operativa vs Bóveda Fiscal</span></div>
          <div class="kpi-val">${fmtUSD(resumen.liquidezMagiaOperativa)}</div>
          <div class="kpi-sub">🔒 Bóveda Fiscal Intocable (IVA/Alcaldía): <strong style="color:#38bdf8;">${fmtUSD(resumen.bovedaFiscalMagia)}</strong></div>
        </div>
        <div class="kpi-card amber">
          <div class="kpi-title"><span>Compromiso con Socio (Gabriel)</span></div>
          <div class="kpi-val" style="color: #fbbf24;">${fmtUSD(resumen.sueldoMagia)}<span style="font-size:13px;">/mes</span></div>
          <div class="kpi-sub">Deuda por gastos cruzados a reembolsar: <strong>${fmtUSD(resumen.magiaDebeASocio)}</strong></div>
        </div>
      `;
      return;
    }

    if (state.entidadActiva === "PAPEL") {
      grid.innerHTML = `
        <div class="kpi-card cyan">
          <div class="kpi-title"><span>📄 Cobranzas Reales Papel B2B</span> <span class="pill-tag pill-blue">Túnel Live</span></div>
          <div class="kpi-val" style="color: #38bdf8;">${fmtUSD(pLive.total_cobrado_usd)}</div>
          <div class="kpi-sub">Facturado en ${pLive.despachos_count || 23} despachos: ${fmtUSD(pLive.total_facturado_usd)} (${pLive.unidades_despachadas || 88} rollos)</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-title"><span>Stock Papel (Vzla + En Agua)</span></div>
          <div class="kpi-val" style="color: #34d399;">${pLive.stock_vzla || 125} <span style="font-size:15px;">Vzla</span> + ${pLive.stock_agua || 52} <span style="font-size:15px;">Agua</span></div>
          <div class="kpi-sub">Valor Landed: ${fmtUSD(pLive.valor_stock_landed_usd)} | PVP Vzla: ${fmtUSD(pLive.valor_stock_pvp_usd)}</div>
        </div>
        <div class="kpi-card purple">
          <div class="kpi-title"><span>Liquidez Operativa vs Bóveda Fiscal</span></div>
          <div class="kpi-val">${fmtUSD(resumen.liquidezPapelOperativa)}</div>
          <div class="kpi-sub">🔒 Bóveda Fiscal Intocable (IVA/Alcaldía/ISLR): <strong style="color:#c084fc;">${fmtUSD(resumen.bovedaFiscalPapel)}</strong></div>
        </div>
        <div class="kpi-card amber">
          <div class="kpi-title"><span>Sueldo Socio + Cuenta Puente</span></div>
          <div class="kpi-val" style="color: #fbbf24;">${fmtUSD(resumen.sueldoPapel)}<span style="font-size:13px;">/mes</span></div>
          <div class="kpi-sub">Saldo neto por reembolsar al socio: <strong>${fmtUSD(resumen.papelDebeASocio - resumen.socioDebeANegocios)}</strong></div>
        </div>
      `;
      return;
    }

    // VISTA CONSOLIDADA POR DEFECTO (3 BOLSILLOS SEPARADOS)
    const bovedaFiscalTotal = resumen.bovedaFiscalMagia + resumen.bovedaFiscalPapel + 30;
    grid.innerHTML = `
      <div class="kpi-card green">
        <div class="kpi-title">
          <span>👤 Mi Bolsillo Personal + Reservas</span>
          <span class="pill-tag pill-green">Blindado</span>
        </div>
        <div class="kpi-val" style="color: #34d399;">${fmtUSD(resumen.liquidezPersonalOperativa + resumen.fondoPazPersonal + resumen.sobresPersonalAcumulado)}</div>
        <div class="kpi-sub">Operativo: ${fmtUSD(resumen.liquidezPersonalOperativa)} | Fondo Paz &amp; Sobres: ${fmtUSD(resumen.fondoPazPersonal + resumen.sobresPersonalAcumulado)}</div>
      </div>

      <div class="kpi-card purple">
        <div class="kpi-title">
          <span>🔮 Magia con K (Túnel Live)</span>
          <span class="pill-tag pill-purple">${mLive.modelos_activos || 37} Modelos</span>
        </div>
        <div class="kpi-val" style="color: #c084fc;">${fmtUSD(mLive.ingresos_brutos_usd)} <span style="font-size:13px; color:#94a3b8;">Ventas</span></div>
        <div class="kpi-sub">Caja: ${fmtUSD(resumen.liquidezMagiaOperativa)} | Stock Físico: ${mLive.stock_fisico || 94}u (${fmtUSD(mLive.pvp_inventario_usd)} PVP)</div>
      </div>

      <div class="kpi-card cyan">
        <div class="kpi-title">
          <span>📄 Papel B2B (Túnel Live)</span>
          <span class="pill-tag pill-blue">${pLive.clientes_activos || 4} Clientes</span>
        </div>
        <div class="kpi-val" style="color: #38bdf8;">${fmtUSD(pLive.total_cobrado_usd)} <span style="font-size:13px; color:#94a3b8;">Cobrados</span></div>
        <div class="kpi-sub">Caja: ${fmtUSD(resumen.liquidezPapelOperativa)} | Stock Vzla: ${pLive.stock_vzla || 125} rollos + ${pLive.stock_agua || 52} agua</div>
      </div>

      <div class="kpi-card amber">
        <div class="kpi-title">
          <span>⚖️ Bóveda Fiscal &amp; Cruces Socio</span>
          <span class="pill-tag pill-amber">SENIAT / Alcaldía</span>
        </div>
        <div class="kpi-val" style="color: #fbbf24;">${fmtUSD(bovedaFiscalTotal)} <span style="font-size:13px; color:#94a3b8;">Intocable</span></div>
        <div class="kpi-sub">Negocios te deben por gastos cruzados: <strong style="color:#f8fafc;">${fmtUSD(resumen.saldoNetoPuenteSocio)}</strong></div>
      </div>
    `;
  }

  // Renderizar Pestaña 1: Presupuesto Personal Base Cero y Sobres Digitales
  function renderTabPersonal(resumen) {
    const state = window.FINANZAS_STATE;
    const strip = document.getElementById("personal-health-strip");
    const blocksContainer = document.getElementById("personal-budget-blocks");
    const badgeBaseCero = document.getElementById("badge-ecuacion-base-cero");

    const sinAsignar = resumen.ingresoPersonalMeta - resumen.totalPresupuestadoPersonal;
    if (badgeBaseCero) {
      if (Math.abs(sinAsignar) < 0.05) {
        badgeBaseCero.className = "pill-tag pill-green";
        badgeBaseCero.innerText = "✅ Presupuesto Base Cero Exacto ($0.00 sin misión)";
      } else if (sinAsignar > 0) {
        badgeBaseCero.className = "pill-tag pill-amber";
        badgeBaseCero.innerText = `⚠️ Tienes ${fmtUSD(sinAsignar)} sin asignar a ningún sobre`;
      } else {
        badgeBaseCero.className = "pill-tag pill-red";
        badgeBaseCero.innerText = `🔴 Presupuesto excedido en ${fmtUSD(Math.abs(sinAsignar))} vs tu Sueldo Fundador`;
      }
    }

    const hoyDia = new Date().getDate();
    const pctMesTranscurrido = Math.min(100, Math.round((hoyDia / 30) * 100));
    const pctPresupuestoEjecutado = Math.round((resumen.totalEjecutadoPersonal / (resumen.totalPresupuestadoPersonal || 1)) * 100);

    if (strip) {
      strip.innerHTML = `
        <div style="background:#0f172a; border:1px solid var(--border); padding:12px 14px; border-radius:10px;">
          <div style="font-size:11px; color:#94a3b8; font-weight:700;">SUELDO FUNDADOR CONSOLIDADO</div>
          <div style="font-size:19px; font-weight:800; color:#34d399; margin-top:2px;">${fmtUSD(resumen.ingresoPersonalMeta)} / mes</div>
          <div style="font-size:11.5px; color:#cbd5e1;">Magia ($350) + Papel ($250)</div>
        </div>
        <div style="background:#0f172a; border:1px solid var(--border); padding:12px 14px; border-radius:10px;">
          <div style="font-size:11px; color:#94a3b8; font-weight:700;">RITMO DEL MES (PACING DÍA ${hoyDia}/30)</div>
          <div style="font-size:19px; font-weight:800; color:${pctPresupuestoEjecutado <= pctMesTranscurrido + 15 ? "#38bdf8" : "#fbbf24"}; margin-top:2px;">
            ${pctPresupuestoEjecutado}% ejecutado <span style="font-size:12px; color:#94a3b8;">(${pctMesTranscurrido}% del mes)</span>
          </div>
          <div style="font-size:11.5px; color:#cbd5e1;">Disponible restante: ${fmtUSD(resumen.totalPresupuestadoPersonal - resumen.totalEjecutadoPersonal)}</div>
        </div>
        <div style="background:#0f172a; border:1px solid var(--border); padding:12px 14px; border-radius:10px;">
          <div style="font-size:11px; color:#94a3b8; font-weight:700;">RUNWAY PERSONAL (FONDO DE PAZ)</div>
          <div style="font-size:19px; font-weight:800; color:#c084fc; margin-top:2px;">${resumen.runwayMeses.toFixed(1)} Meses Cubiertos</div>
          <div style="font-size:11.5px; color:#cbd5e1;">Reserva: ${fmtUSD(resumen.fondoPazPersonal)} vs Vitales: ${fmtUSD(resumen.gastoBloqueA)}/m</div>
        </div>
        <div style="background:#0f172a; border:1px solid var(--border); padding:12px 14px; border-radius:10px;">
          <div style="font-size:11px; color:#94a3b8; font-weight:700;">CONTROL GASTOS HORMIGA &amp; BRECHA</div>
          <div style="font-size:19px; font-weight:800; color:#fbbf24; margin-top:2px;">🐜 ${fmtUSD(resumen.gastosHormigaMes)} <span style="font-size:12px; color:#34d399;">| Ahorro: +${fmtUSD(resumen.ahorroCambiarioMes)}</span></div>
          <div style="font-size:11.5px; color:#cbd5e1;">Pagando servicios/mercado en Bs a BCV</div>
        </div>
      `;
    }

    if (!blocksContainer) return;

    const definicionBloques = [
      {
        id: "BLOQUE_A_VITALES",
        titulo: "🏠 Bloque A: Necesidades Vitales y Gastos Fijos",
        subtitulo: "Gastos esenciales para vivir y operar (Meta: 50% - 55% de tu sueldo personal)",
        color: "#10b981"
      },
      {
        id: "BLOQUE_B_SOBRES",
        titulo: "🏦 Bloque B: Sobres Digitales / Provisiones Anuales (Sinking Funds)",
        subtitulo: "Cuota mensual para que HCM, cauchos, reparaciones o impuestos nunca sean una crisis (15%)",
        color: "#38bdf8"
      },
      {
        id: "BLOQUE_C_ESTILO_VIDA",
        titulo: "🍔 Bloque C: Estilo de Vida y Gastos Discrecionales",
        subtitulo: "Calidad de vida, salidas, streaming y tope estricto de gastos hormiga (15%)",
        color: "#f59e0b"
      },
      {
        id: "BLOQUE_D_FUTURO_DEUDAS",
        titulo: "🛡️ Bloque D: Libertad Financiera, Fondo de Paz e Inversión",
        subtitulo: "Págate a ti primero: blindaje en USDT fuera de tus negocios (15% - 20%)",
        color: "#a855f7"
      }
    ];

    blocksContainer.innerHTML = definicionBloques.map(bl => {
      const items = state.categorias.filter(c => c.bloque === bl.id);
      const sumPresupuesto = items.reduce((acc, c) => acc + (Number(c.presupuesto_mensual_usd) || 0), 0);
      const sumEjecutado = items.reduce((acc, c) => acc + (Number(c.gasto_acumulado_mes_usd) || 0), 0);
      const pctBloque = sumPresupuesto > 0 ? Math.round((sumEjecutado / sumPresupuesto) * 100) : 0;

      const itemsHtml = items.map(c => {
        const pres = Number(c.presupuesto_mensual_usd) || 0;
        const gast = Number(c.gasto_acumulado_mes_usd) || 0;
        const pct = pres > 0 ? Math.min(100, Math.round((gast / pres) * 100)) : 0;

        let barColor = "#10b981";
        let statusTag = `<span class="pill-tag pill-green">🟢 Saludable (${pct}%)</span>`;
        if (pct >= 95) {
          barColor = "#ef4444";
          statusTag = `<span class="pill-tag pill-red">🔴 Tope Alcanzado (${pct}%)</span>`;
        } else if (pct >= 75) {
          barColor = "#f59e0b";
          statusTag = `<span class="pill-tag pill-amber">🟡 Alerta (${pct}%)</span>`;
        }

        const esSobre = Number(c.meta_sobre_total_usd) > 0;
        const sobreInfo = esSobre
          ? `<div style="margin-top:6px; padding-top:6px; border-top:1px dashed rgba(255,255,255,0.08); display:flex; justify-content:space-between; font-size:11.5px; color:#7dd3fc;">
               <span>🏦 Acumulado en Sobre: <strong>${fmtUSD(c.saldo_sobre_actual_usd)}</strong> de ${fmtUSD(c.meta_sobre_total_usd)}</span>
               <span>Avance Meta Anual: <strong>${Math.round((Number(c.saldo_sobre_actual_usd) / Number(c.meta_sobre_total_usd)) * 100)}%</strong></span>
             </div>`
          : "";

        const badgeMoneda = c.moneda_optima === "VES_BCV"
          ? `<span class="pill-tag pill-green" title="Conviene pagar en Bolívares a Tasa BCV para ganar el 16% de brecha cambiaria">Pagar en VES (BCV)</span>`
          : `<span class="pill-tag pill-blue" title="Resguardar y ejecutar directamente en USDT / USD">Resguardar en USDT</span>`;

        const badgeIslr = c.aplica_desgravamen_islr
          ? `<span class="pill-tag pill-purple" title="Guarda la Factura Fiscal SENIAT para deducir del ISLR Persona Natural">🧾 Desgravamen ISLR</span>`
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
                <div style="font-size:14px; font-weight:800; color:#f8fafc;">
                  ${fmtUSD(gast)} <span style="color:#94a3b8; font-weight:500;">/ ${fmtUSD(pres)}</span>
                </div>
                <div style="font-size:11px; color:#94a3b8;">
                  Disp: ${fmtUSD(Math.max(0, pres - gast))} (${fmtVES(Math.max(0, pres - gast) * resumen.bcv)} BCV)
                </div>
              </div>
            </div>

            <div class="progress-track">
              <div class="progress-fill" style="width:${pct}%; background:${barColor};"></div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; color:#94a3b8; margin-top:4px;">
              <span>${c.notas || ""}</span>
              <button type="button" style="background:none; border:1px solid #475569; color:#cbd5e1; border-radius:6px; padding:2px 8px; font-size:11px; cursor:pointer;" onclick="window.editarTopeCategoriaPrompt('${c.codigo}')">
                ✏️ Ajustar Tope
              </button>
            </div>
            ${sobreInfo}
          </div>
        `;
      }).join("");

      return `
        <div class="budget-block-card" style="border-top: 3px solid ${bl.color};">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <h3 style="font-size:15px; font-weight:800; color:#f8fafc;">${bl.titulo}</h3>
            <span class="pill-tag" style="background:rgba(255,255,255,0.08); color:#f8fafc;">
              ${fmtUSD(sumEjecutado)} / ${fmtUSD(sumPresupuesto)} (${pctBloque}%)
            </span>
          </div>
          <p style="font-size:12px; color:#94a3b8; margin-bottom:12px;">${bl.subtitulo}</p>
          ${itemsHtml}
        </div>
      `;
    }).join("");
  }

  // Renderizar Pestaña 2: El Túnel de Emprendimientos (Magia con K y Papel) + Conciliador de Cruces
  function renderTabTunel(resumen) {
    const state = window.FINANZAS_STATE;
    const container = document.getElementById("tunel-entities-cards");
    const tbodyCruces = document.getElementById("tbody-cruces-patrimoniales");
    const badgePuente = document.getElementById("badge-balance-puente");

    const m = state.tunelLive?.magia_con_k || {};
    const p = state.tunelLive?.papel || {};

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
        <!-- Tarjeta 1: MAGIA CON K -->
        <div class="budget-block-card" style="border-top: 4px solid #a855f7;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div>
              <h3 style="font-size:16px; font-weight:800; color:#f8fafc;">🔮 Magia con K (E-Commerce)</h3>
              <span style="font-size:11.5px; color:#c084fc;">Conectado a <code>erp_articulos</code> &amp; <code>erp_ventas_transacciones</code></span>
            </div>
            <span class="pill-tag pill-purple">RNE / Firma Personal</span>
          </div>

          <div style="background:#0f172a; border:1px solid var(--border); border-radius:10px; padding:12px; margin-bottom:12px; font-size:12.5px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">Ventas Acumuladas (Túnel):</span>
              <strong style="color:#f8fafc;">${fmtUSD(m.ingresos_brutos_usd)} (${m.unidades_vendidas || 136} und)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">Stock Físico + En Tránsito:</span>
              <strong style="color:#34d399;">${m.stock_fisico || 94} fís. + ${m.stock_transito || 141} tráns. (${m.modelos_activos || 37} mod)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">Valoración Inventario (Costo / PVP):</span>
              <strong>${fmtUSD(m.costo_inventario_usd)} / ${fmtUSD(m.pvp_inventario_usd)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; padding-top:6px; border-top:1px dashed var(--border);">
              <span style="color:#38bdf8;">🔒 Bóveda Fiscal Intocable (IVA/Alcaldía):</span>
              <strong style="color:#38bdf8;">${fmtUSD(resumen.bovedaFiscalMagia)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#fbbf24;">🤝 Deuda con Gabriel (Gastos Cruzados):</span>
              <strong style="color:#fbbf24;">${fmtUSD(resumen.magiaDebeASocio)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding-top:6px; border-top:1px solid var(--border);">
              <span style="color:#6ee7b7; font-weight:700;">💵 Sueldo Fundador Mensual a Gabriel:</span>
              <strong style="color:#34d399; font-size:14px;">${fmtUSD(resumen.sueldoMagia)} / mes</strong>
            </div>
          </div>

          <div style="display:flex; gap:8px;">
            <button type="button" class="sync-action-btn" style="flex:1; justify-content:center; background:rgba(168,85,247,0.2); border:1px solid #a855f7; color:#e9d5ff;" onclick="window.registrarPagoSueldoRapido('MAGIA_CON_K', ${resumen.sueldoMagia})">
              💸 Transferir Sueldo a Personal
            </button>
          </div>
        </div>

        <!-- Tarjeta 2: PAPEL B2B -->
        <div class="budget-block-card" style="border-top: 4px solid #0ea5e9;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div>
              <h3 style="font-size:16px; font-weight:800; color:#f8fafc;">📄 Papel (Distribución B2B)</h3>
              <span style="font-size:11.5px; color:#38bdf8;">Conectado a <code>erp_papel_ventas</code> &amp; <code>erp_papel_pagos</code></span>
            </div>
            <span class="pill-tag pill-blue">Mayorista B2B</span>
          </div>

          <div style="background:#0f172a; border:1px solid var(--border); border-radius:10px; padding:12px; margin-bottom:12px; font-size:12.5px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">Facturado vs Cobrado Real (Túnel):</span>
              <strong style="color:#f8fafc;">${fmtUSD(p.total_facturado_usd)} fact. / <span style="color:#34d399;">${fmtUSD(p.total_cobrado_usd)} cobrado</span></strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">Stock Rollos (Venezuela + En Agua):</span>
              <strong style="color:#38bdf8;">${p.stock_vzla || 125} Vzla + ${p.stock_agua || 52} Marítimo (${p.skus_activos || 2} SKUs)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">Valor Stock Landed / PVP Vzla:</span>
              <strong>${fmtUSD(p.valor_stock_landed_usd)} / ${fmtUSD(p.valor_stock_pvp_usd)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; padding-top:6px; border-top:1px dashed var(--border);">
              <span style="color:#38bdf8;">🔒 Bóveda Fiscal Intocable (IVA/Alcaldía/ISLR):</span>
              <strong style="color:#38bdf8;">${fmtUSD(resumen.bovedaFiscalPapel)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#fbbf24;">🤝 Saldo Neto Cuenta Puente Socio:</span>
              <strong style="color:#fbbf24;">${fmtUSD(resumen.papelDebeASocio - resumen.socioDebeANegocios)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding-top:6px; border-top:1px solid var(--border);">
              <span style="color:#6ee7b7; font-weight:700;">💵 Sueldo Fundador Mensual a Gabriel:</span>
              <strong style="color:#34d399; font-size:14px;">${fmtUSD(resumen.sueldoPapel)} / mes</strong>
            </div>
          </div>

          <div style="display:flex; gap:8px;">
            <button type="button" class="sync-action-btn" style="flex:1; justify-content:center; background:rgba(14,165,233,0.2); border:1px solid #0ea5e9; color:#bae6fd;" onclick="window.registrarPagoSueldoRapido('PAPEL', ${resumen.sueldoPapel})">
              💸 Transferir Sueldo a Personal
            </button>
          </div>
        </div>

        <!-- Tarjeta 3: BOLSILLO PERSONAL RECEPTOR -->
        <div class="budget-block-card" style="border-top: 4px solid #10b981;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div>
              <h3 style="font-size:16px; font-weight:800; color:#f8fafc;">👤 Bolsillo Personal (Gabriel)</h3>
              <span style="font-size:11.5px; color:#34d399;">Receptor de Sueldo Fundador y Dividendos</span>
            </div>
            <span class="pill-tag pill-green">Patrimonio Separado</span>
          </div>

          <div style="background:#0f172a; border:1px solid var(--border); border-radius:10px; padding:12px; margin-bottom:12px; font-size:12.5px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">Ingreso Fijo Mensual (Sueldo Socio):</span>
              <strong style="color:#34d399;">${fmtUSD(resumen.ingresoPersonalMeta)} / mes</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">Gastos Vitales (Bloque A):</span>
              <strong>${fmtUSD(resumen.gastoBloqueA)} / mes</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#94a3b8;">Sobres Anuales + Estilo de Vida:</span>
              <strong>${fmtUSD(resumen.totalPresupuestadoPersonal - resumen.gastoBloqueA)} / mes</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; padding-top:6px; border-top:1px dashed var(--border);">
              <span style="color:#c084fc;">🛡️ Fondo de Paz Acumulado (USDT):</span>
              <strong style="color:#c084fc;">${fmtUSD(resumen.fondoPazPersonal)} (${resumen.runwayMeses.toFixed(1)} m)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="color:#38bdf8;">🏦 Bóveda de Sobres Personales:</span>
              <strong style="color:#38bdf8;">${fmtUSD(resumen.sobresPersonalAcumulado)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding-top:6px; border-top:1px solid var(--border);">
              <span style="color:#fbbf24; font-weight:700;">⚡ Por Cobrar a Magia + Papel:</span>
              <strong style="color:#fbbf24; font-size:14px;">+${fmtUSD(resumen.saldoNetoPuenteSocio)}</strong>
            </div>
          </div>

          <div style="font-size:11.5px; color:#94a3b8; line-height:1.4;">
            ✅ <strong>Regla de Blindaje:</strong> Ningún gasto personal sale directo del capital de reposición de China (Magia) ni de la importación marítima (Papel).
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
            <div style="font-size:11.5px; color:#94a3b8; margin-top:2px;">
              Poder adquisitivo real: <strong>${fmtUSD(equivUsdt)} USDT</strong>
              ${w.es_intocable_fiscal ? " &bull; 🔒 Dinero reservado para impuestos" : ""}
            </div>
            ${alertaDevaluacion}
          </div>
        `;
      }).join("");
    }

    if (tbodyTx) {
      const txFiltradas = state.entidadActiva === "TODOS"
        ? state.transacciones
        : state.transacciones.filter(t => t.entidad_codigo === state.entidadActiva || t.entidad_pagadora_cruce === state.entidadActiva);

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
  function renderChartsPersonal() {
    if (typeof Chart === "undefined") return;
    const state = window.FINANZAS_STATE;

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
            label: "Ejecutado ($)",
            data: topCats.map(c => Number(c.gasto_acumulado_mes_usd) || 0),
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

  function renderAllFinanzas() {
    const resumen = calcularResumenGlobal();
    renderMainKPIs(resumen);
    renderTabPersonal(resumen);
    renderTabTunel(resumen);
    renderTabFiscal(resumen);
    renderTabLibro(resumen);
    renderChartsPersonal();
    if (typeof window.renderTablaGmailFacturas === "function") {
      window.renderTablaGmailFacturas();
    }
  }

  // Exponer funciones globales
  window.renderAllFinanzas = renderAllFinanzas;
  window.cambiarEntidadActiva = cambiarEntidadActiva;
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAllFinanzas);
  } else {
    renderAllFinanzas();
  }
})();
