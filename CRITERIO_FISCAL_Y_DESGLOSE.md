# Criterio de desglose de Oficia

**Revisión de fuentes: 15 de octubre de 2026.** Documento de producto y control operativo; no sustituye opinión fiscal, contable ni legal.

## Lo que muestra ahora el panel del anfitrión

Para cada ticket activo de un espacio real, el panel presenta:

1. Renta base guardada por la reserva, calculada por Supabase a partir de la tarifa del espacio.
2. Tarifa de operación de Oficia: 15% de la renta base. No se suma el IVA ni otro impuesto de la renta a esta base.
3. IVA de referencia del 16% aplicado únicamente a la tarifa de Oficia.
4. Referencia para el dueño tras la comisión hipotética y el IVA estimado de la comisión, antes de sus impuestos.

La base y los tres importes estimados los calcula Postgres en columnas generadas de la reserva, para que cliente, anfitrión y Operaciones compartan la misma cifra; las tasas están en la migración versionada `20261015195201_booking_fee_breakdown.sql`. Los importes son una simulación: Oficia no recibe, retiene, cobra ni concilia dinero, y no registra liquidaciones al anfitrión. El panel lo identifica como estimado y muestra tickets pendientes sin exigir un pago. El documento no es CFDI, recibo fiscal ni constancia de retención. Las reservas históricas solo guardan una tarifa/total; sus columnas nuevas muestran estimaciones matemáticas, no reconstruyen ni acreditan impuestos históricos.

## Lectura fiscal relevante

- La LIVA define el uso o goce temporal de bienes e incluye el arrendamiento; su excepción de IVA refiere a inmuebles usados exclusivamente como casa habitación, con excepciones. Un espacio comercial/de trabajo no debe tratarse automáticamente como renta habitacional exenta. La tarifa y emisión de CFDI deben validarse para cada modalidad contractual. [LIVA, arts. 19–20](https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf) y [orientación SAT para arrendadores](https://wwwmat.sat.gob.mx/consulta/26988/conoce-tus-obligaciones-como-arrendador).
- SAT publica un ejemplo de arrendamiento de local comercial y explica retenciones al pagar renta a persona física desde una persona moral. La tasa y el cálculo dependen del régimen del dueño y de quién sea jurídicamente el arrendatario/pagador; no se aplican en masa desde la app. [Ejemplo SAT de CFDI de arrendamiento comercial](https://www.sat.gob.mx/minisitio/Factura/documentos/arrendamiento_local_comercial.pdf), [LISR, art. 116](https://wwwmatnp.sat.gob.mx/articulo/53508/articulo-116), [LIVA, art. 1-A](https://wwwmat.sat.gob.mx/articulo/18243/articulo-1-a).
- Oficia enlaza oferta y demanda en línea, así que debe obtenerse opinión sobre las obligaciones aplicables a intermediarios digitales mexicanos, incluyendo información de anfitriones, precios con IVA desglosado y, cuando Oficia cobre por cuenta del anfitrión, posibles retenciones, entero y comprobante. La ley y RMF contienen reglas específicas de intermediación; la categoría fiscal de una renta de oficina por hora, día o semana no se debe equiparar sin análisis al hospedaje. [LIVA, arts. 18-B y 18-J–18-K](https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf), [RMF 2026, reglas de plataformas](https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/RMF_2026-DOF-28122025.pdf), [LISR, art. 113-A](https://wwwmatnp.sat.gob.mx/articulo/05058/articulo-113-a).
- En Chihuahua existe impuesto cedular por arrendamiento para personas físicas que obtienen ingresos de inmuebles en el estado; su aplicación y obligaciones dependen del anfitrión y de la actividad. La Ley estatal regula impuesto sobre hospedaje por separado; el artículo 41 delimita ese servicio. La app no calcula ninguno de los dos hoy. [Portal de Hacienda de Chihuahua, formato de arrendamiento 2026 y Ley de Hacienda](https://ipagos.chihuahua.gob.mx/), [Ley de Hacienda del Estado, arts. 41–46](https://ipagos.chihuahua.gob.mx/ayuda/formatos/Ley_de_Hacienda_del_Estado_de_Chihuahua.pdf).
- Como persona moral, Oficia debe definir sus obligaciones propias de RFC, CFDI, contabilidad, declaraciones y, en su caso, retenciones; ser S.A.S. no determina por sí solo la factura que corresponde a cada ingreso ni el régimen del anfitrión. [SAT, obligaciones de personas morales](https://wwwmat.sat.gob.mx/consulta/64576/conoce-las-obligaciones), [inscripción de S.A.S. al RFC](https://wwwmatnp.sat.gob.mx/consultas/27517/consulta-los-requisitos-para-realizar-tu-inscripiocon-de-sociedades-por-acciones-simplificadas.).

## Antes de cobrar o liquidar dinero real

Obtener dictamen profesional que responda: (1) si Oficia es intermediaria, comisionista o arrendataria/subarrendadora según contrato; (2) quién cobra y factura al cliente y quién factura la comisión; (3) si Oficia entra en obligaciones de plataforma/intermediación para estas rentas; (4) cómo cambia el tratamiento según anfitrión persona física, RESICO, actividad empresarial, arrendamiento o persona moral; (5) retenciones ISR/IVA, informativas y fechas; (6) posible impuesto cedular de Chihuahua e impuesto sobre hospedaje si una oferta constituye hospedaje; (7) cancelaciones, devoluciones y notas de crédito; y (8) quién recauda y liquida cada concepto.

Después de la validación, almacenar en la reserva una instantánea inmutable por concepto, tasa, base, autoridad, anfitrión, estado de cobro/retención y versión de regla. No recalcular reservas antiguas al cambiar tasas; generar CFDI/constancias únicamente con datos validados y un proveedor autorizado.
