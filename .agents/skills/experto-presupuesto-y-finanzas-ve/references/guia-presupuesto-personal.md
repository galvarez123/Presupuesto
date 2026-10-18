# Guía Maestra de Gestión de Presupuesto Personal

Esta referencia define la estructura contable, las categorías, el sistema de sobres digitales y los indicadores de salud financiera para el módulo de **Presupuesto Personal** de la plataforma.

---

## 1. Arquitectura del Presupuesto Base Cero (Zero-Based Budget)

En el Presupuesto Base Cero, el objetivo al planificar cada mes es asignar el **100% del ingreso personal disponible** entre cuatro grandes bloques:

$$\text{Ingreso Personal Disponible} - (\text{Gastos Fijos} + \text{Gastos Variables} + \text{Sobres/Provisiones} + \text{Ahorro/Deudas}) = 0$$

### Bloques y Categorías Maestras Recomendadas

#### Bloque A: Necesidades Vitales y Gastos Fijos (Meta orientativa: 50% - 55%)
Son compromisos obligatorios para vivir y operar personalmente:
- **Vivienda:** Alquiler o hipoteca, condominio, mantenimiento básico del hogar.
- **Servicios Básicos:** Electricidad (Corpoelec), agua (Hidrocapital/cisterna), gas, aseo urbano residencial.
- **Conectividad y Herramientas Personales:** Internet fibra óptica residencial, plan de datos móviles, servicios en la nube personales.
- **Alimentación Base:** Supermercado, proteínas, verduras/feria, agua potable.
- **Salud Recurrente:** Medicamentos de uso continuo, consultas de control.
- **Transporte Personal:** Combustible personal, estacionamiento, traslado diario.
- **Educación / Familia:** Mensualidades escolares/universitarias, apoyo familiar fijo.

#### Bloque B: Sobres Digitales / Provisiones Personales (Sinking Funds) (Meta orientativa: 10% - 15%)
Fondos donde se deposita una cuota fija mensual para cubrir gastos futuros previsibles sin tocar el fondo de emergencia ni endeudarse:
- **Sobre Salud & Pólizas (HCM / Funerario / Vida):** Cuota mensual = $\frac{\text{Prima Anual Total}}{12}$ + fondo para deducibles/odontología/oftalmología.
- **Sobre Vehículo (Mantenimiento y Legal):** Cambio de aceite, cauchos, batería, frenos, RCV, trimestres municipales.
- **Sobre Hogar y Electrodomésticos:** Fondo para reparaciones de aires acondicionados, nevera, plomería o pintura.
- **Sobre Impuestos y Trámites Personales:** Provisión para ISLR Persona Natural, renovación de pasaporte, licencia, cédula o documentos legales.
- **Sobre Anualidades y Celebraciones:** Cumpleaños familiares, Navidad, vacaciones, inscripciones anuales.

#### Bloque C: Estilo de Vida y Gastos Discrecionales (Meta orientativa: 15% - 20%)
Gastos que aportan calidad de vida pero que pueden recortarse inmediatamente en meses de baja liquidez:
- **Restaurantes, Cafés y Delivery.**
- **Entretenimiento, Cine, Eventos y Paseos.**
- **Suscripciones Digitales de Ocio:** Streaming de video/música, videojuegos, apps no esenciales.
- **Cuidado Personal, Ropa y Calzado.**
- **Tope de Gastos Hormiga (Bolsillo Libre):** Pequeño monto asignado para gastos menores sin fricción, pero con límite mensual estricto.

#### Bloque D: Libertad Financiera, Ahorro y Deudas (Meta orientativa: 20%+)
- **Fondo de Emergencia Personal (Paz Mental):** Meta escalonada:
  - *Nivel 1 (Arranque):* $1.000 USD (o 1 mes de gastos básicos).
  - *Nivel 2 (Seguridad):* 3 meses de gastos básicos + fijos en moneda dura (`USD` / `USDT`).
  - *Nivel 3 (Blindaje Emprendedor):* 6 a 12 meses de gastos personales cubiertos (indispensable cuando tus ingresos provienen de emprendimientos propios).
- **Amortización de Deudas Personales:**
  - *Método Bola de Nieve:* Pagar el mínimo en todas las deudas y atacar con todo el excedente la deuda de **menor saldo** para ganar tracción psicológica y liberar flujo de caja rápido.
  - *Método Avalancha:* Atacar primero la deuda con **mayor tasa de interés o indexación cambiaria más agresiva**.
- **Inversión Patrimonial Personal:** Ahorro destinado a activos productivos independientes del emprendimiento principal (ETF, bienes raíces, instrumentos de renta fija, etc.).

---

## 2. Reglas de Operación en Economía Bimonetaria (VES / USD / USDT)

1. **Moneda Ancla del Presupuesto Personal:**
   - El presupuesto mensual se planifica en **USD Reales (Poder Adquisitivo / USDT)**, pero cada categoría indica su **Moneda Óptima de Ejecución**:
     - *Categorías óptimas en `VES` (sin perder poder adquisitivo):* Servicios públicos, impuestos nacionales/municipales, condominios facturados a BCV, supermercados y comercios formales que cobran a tasa BCV sin recargo de IGTF (3%).
     - *Categorías óptimas en `USD` / `USDT`:* Ahorro, sobres de largo plazo (HCM, vehículo, fondo de emergencia), alquileres pactados en divisas o proveedores con descuento en divisas que supere la brecha cambiaria.
2. **Cálculo de Brecha Cambiaria y Ahorro por Conversión:**
   - **Brecha Cambiaria (%):**
     $$\text{Brecha (\%)} = \left( \frac{\text{Tasa USDT/Paralelo} - \text{Tasa BCV}}{\text{Tasa BCV}} \right) \times 100$$
   - Si un comercio cobra en bolívares a Tasa BCV el mismo precio en dólares que en divisas (más el ahorro del 3% de IGTF), liquidar la porción necesaria de `USDT` a `VES` el mismo día del pago reduce el costo real en dólares de esa categoría del presupuesto personal.
   - **Regla Anti-Devaluación:** Nunca mantener en cuentas bancarias en `VES` más del efectivo necesario para los próximos **3 a 5 días** de gastos personales programados en bolívares.

---

## 3. Indicadores Clave (KPIs) para el Dashboard de Presupuesto Personal

La aplicación web debe calcular y mostrar en tiempo real:

1. **Índice de Ejecución vs. Ritmo del Mes (Pacing Ratio):**
   $$\text{Ritmo de Categoría} = \frac{\% \text{ Presupuesto Consumido}}{\% \text{ Días Transcurridos del Mes}}$$
   - Si estamos en el día 15 de un mes de 30 días ($50\%$ del mes) y la categoría "Restaurantes" lleva el $80\%$ consumido ($\text{Ritmo} = 1.6$), el sistema dispara alerta amarilla/roja.
2. **Tasa de Ahorro Personal Real (%):**
   $$\text{Tasa de Ahorro} = \left( \frac{\text{Aportes a Fondo Emergencia} + \text{Inversión Personal}}{\text{Ingreso Personal Neto del Mes}} \right) \times 100$$
3. **Runway Personal (Meses de Supervivencia):**
   $$\text{Runway (Meses)} = \frac{\text{Liquidez Personal Total en Reserva (Fondo de Emergencia)}}{\text{Promedio Mensual de Bloque A (Necesidades Vitales)}}$$
4. **Detector de Gastos Hormiga:**
   - Suma automática de todas las transacciones menores a $\$10\text{ USD}$ en categorías no esenciales (cafés, snacks, comisiones bancarias evitables, propinas excesivas, recargas imprevistas) y muestra cuánto representarían anualizadas.
