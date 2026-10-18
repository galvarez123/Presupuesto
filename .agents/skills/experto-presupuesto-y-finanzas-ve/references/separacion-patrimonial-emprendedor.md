# Separación Patrimonial: Finanzas Personales vs. Emprendimientos

Uno de los mayores riesgos financieros y legales de todo emprendedor en Venezuela es mezclar el flujo de caja personal con el de sus negocios. Esta guía establece el protocolo contable y funcional para mantener una frontera blindada entre el **Bolsillo Personal** y cada **Emprendimiento**.

---

## 1. Los 4 Principios de Separación Patrimonial

1. **Cuentas y Billeteras Separadas:**
   - Ninguna cuenta bancaria, billetera digital (`Zelle`, `Binance/USDT`, `Wally`, `Zinli`, `Pago Móvil`) o caja de efectivo debe usarse simultáneamente como fondo personal y fondo operativo sin control de saldos separados.
   - En la aplicación web, cada **Cuenta/Billetera** pertenece a una única **Entidad** (`Personal` o `Emprendimiento X`).
2. **El Emprendedor es un Proveedor/Empleado Clave + Accionista:**
   - Como **Operador/Director**, cobras un **Sueldo de Fundador (Honorarios)** fijo y predecible.
   - Como **Dueño/Accionista**, cobras **Dividendos/Utilidades** únicamente cuando el negocio genera ganancia neta real después de cubrir costos de reposición, gastos operativos, fondo de reserva del negocio e impuestos.
3. **Prohibición de "Asaltar la Caja":**
   - El efectivo o saldo en banco del emprendimiento tiene compromisos previos: reposición de inventario/costos directos, nómina, alquiler comercial, **IVA cobrado (que pertenece al SENIAT)** e **Impuesto Municipal**. Sacar dinero sin clasificar destruye el capital de trabajo.
4. **Todo Cruce de Dinero Deja Rastro (Cuentas Puente Socio ↔ Empresa):**
   - Si por urgencia operativa una billetera personal paga algo del negocio (o viceversa), el sistema **jamás** debe distorsionar el presupuesto personal ni el estado de resultados del negocio; debe usar una **Cuenta Puente de Conciliación**.

---

## 2. Matriz de Casos de Uso y Asientos Automáticos

Cuando el usuario registra un movimiento en la aplicación web, el motor contable aplica estas reglas:

| Escenario Real | ¿Qué hace el usuario? | Impacto en Presupuesto Personal | Impacto en el Emprendimiento | Estado de la Cuenta Puente (Socio ↔ Empresa) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Pago de Sueldo del Fundador** | Transfiere su quincena/mes desde el Emprendimiento a su cuenta Personal. | **+ Ingreso Personal** disponible para presupuestar (Base Cero). | **- Gasto Operativo** (Sueldo Dirección / Honorarios). | Neutro ($0$). |
| **2. Retiro de Utilidades / Dividendos** | Retira parte de las ganancias acumuladas de cierre de trimestre/mes. | **+ Ingreso Extraordinario Personal** (ideal para ahorro/inversión o sobres). | **- Disminución de Utilidades Retenidas** (Patrimonio). | Neutro ($0$). |
| **3. Gasto del Negocio pagado con Bolsillo Personal** | Paga un proveedor o insumo del negocio usando su Pago Móvil o USDT personal. | **No afecta** sus categorías de gasto personal (solo baja su liquidez temporalmente). | **- Gasto/Costo del Emprendimiento** en su categoría real. | **Emprendimiento le debe al Socio** (`+ Cuenta por Cobrar al Negocio`). |
| **4. Gasto Personal pagado con Cuenta del Negocio** | Paga el supermercado de su casa con el punto o Zelle del negocio. | **- Gasto Personal** en la categoría "Supermercado" (consume su presupuesto personal). | **No es gasto del negocio** (evita gastos no deducibles en ISLR). | **Socio le debe al Emprendimiento** (`- Cuenta por Pagar al Negocio` o descuento del próximo sueldo). |
| **5. Aporte de Capital / Préstamo a Emprendimiento Nuevo** | Transfiere ahorros personales para iniciar o inyectar liquidez a un proyecto. | Salida del sobre de "Inversión en Negocios". | **+ Entrada de Caja** por Aporte de Capital o Préstamo de Accionista. | Se registra como **Préstamo por Cobrar al Emprendimiento** o **Capital Social**. |
| **6. Reembolso (Liquidación de Cruces)** | El negocio le transfiere al usuario lo que le debía por compras previas. | Recupera liquidez en su billetera personal (no cuenta como nuevo ingreso). | Salida de caja por pago de pasivo al socio. | La Cuenta Puente vuelve a **$0$**. |

---

## 3. Cómo Fijar el "Sueldo de Fundador" (Fórmula Práctica)

Si el emprendimiento tiene ingresos variables, aplica el **Esquema de Sueldo Base + Bono Variable**:

1. **Calcula tu Presupuesto Personal Mínimo Vital (Bloque A + Bloque B):**
   - Ejemplo: Necesitas $\$600\text{ USD}$ al mes para cubrir tus gastos fijos esenciales y tus sobres de salud/vehículo.
2. **Verifica la Capacidad del Emprendimiento (Punto de Equilibrio):**
   - El Sueldo Base Fijo del fundador debe poder pagarse incluso en el "mes flojo" del emprendimiento sin descapitalizar el inventario ni tocar el dinero de los impuestos.
3. **Bono Trimestral / Mensual por Excedente:**
   - Cuando la utilidad neta del emprendimiento (después de apartar impuestos y un $10\%\text{ - }20\%$ de reserva de crecimiento del propio negocio) supere la meta, se transfiere un porcentaje predefinido al bolsillo personal para alimentar el **Bloque C (Estilo de Vida)** y el **Bloque D (Inversión y Fondo de Paz)**.

---

## 4. Gastos Compartidos (Uso Mixto Personal / Negocio)

Para gastos que sirven tanto a la vida personal como al emprendimiento (ej. Internet residencial cuando trabajas desde casa, plan telefónico, combustible del vehículo):
- Define un **Porcentaje de Prorrateo Fijo** (ej. $60\%$ Personal / $40\%$ Emprendimiento).
- Al registrar la factura, la aplicación web divide automáticamente el gasto: el $60\%$ descuenta del sobre personal y el $40\%$ se imputa a la estructura de costos del emprendimiento.
- **Advertencia Fiscal:** En Venezuela, solo los gastos que cuenten con **Factura Fiscal a nombre del RIF del Emprendimiento** (o RIF con actividad comercial en Firma Personal) son deducibles legalmente para el ISLR y aprovechables como Crédito Fiscal de IVA. Si la factura sale a nombre de un tercero o sin requisitos SENIAT, contablemente es costo interno de gestión, pero **fiscalmente es No Deducible**.
