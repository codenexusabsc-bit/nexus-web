/** Plantillas iniciales del editor. El contenido es HTML que el editor convierte al abrir. */

export interface TemplateVar {
  key: string;
  label: string;
}

export interface Template {
  id: string;
  name: string;
  desc: string;
  variables: TemplateVar[];
  html: string;
}

const V = {
  cliente: { key: "cliente", label: "Cliente" },
  documento: { key: "documento", label: "Cédula o NIT del cliente" },
  fecha: { key: "fecha", label: "Fecha" },
  proyecto: { key: "proyecto", label: "Proyecto" },
  valor: { key: "valor", label: "Valor total" },
  plazo: { key: "plazo", label: "Plazo de entrega" },
  ciudad: { key: "ciudad", label: "Ciudad" },
};

export const TEMPLATES: Template[] = [
  {
    id: "blanco",
    name: "Documento en blanco",
    desc: "Hoja con el encabezado y pie de Nexus.",
    variables: [],
    html: "<p></p>",
  },
  {
    id: "propuesta",
    name: "Propuesta / cotización",
    desc: "Alcance, cronograma, valor y condiciones.",
    variables: [V.cliente, V.proyecto, V.fecha, V.valor, V.plazo],
    html: `
<p><strong>Para:</strong> {cliente}<br><strong>Fecha:</strong> {fecha}<br><strong>Proyecto:</strong> {proyecto}</p>
<h2>1. Lo que entendemos que necesita</h2>
<p>Describa aquí la necesidad del cliente en sus propias palabras.</p>
<h2>2. Alcance</h2>
<ul><li>Entregable 1</li><li>Entregable 2</li><li>Capacitación y manual de uso</li></ul>
<h2>3. Cronograma</h2>
<table><tbody>
<tr><th><p>Etapa</p></th><th><p>Qué se entrega</p></th><th><p>Duración</p></th></tr>
<tr><td><p>Diseño</p></td><td><p>Propuesta visual para aprobar</p></td><td><p>1 semana</p></td></tr>
<tr><td><p>Desarrollo y pruebas</p></td><td><p>Versión funcional</p></td><td><p>2 semanas</p></td></tr>
<tr><td><p>Entrega</p></td><td><p>Publicación, capacitación y manual</p></td><td><p>1 semana</p></td></tr>
</tbody></table>
<p><strong>Plazo total:</strong> {plazo}</p>
<h2>4. Inversión</h2>
<p><strong>Valor total:</strong> {valor}</p>
<p>Forma de pago: 50 % al aprobar la propuesta y 50 % a la entrega.</p>
<h2>5. Condiciones</h2>
<ul><li>Esta propuesta tiene validez de 30 días.</li><li>Los cambios fuera del alcance se cotizan aparte.</li><li>Incluye un mes de soporte después de la entrega.</li></ul>
<p>Quedamos atentos a sus comentarios.</p>
<p><strong>Sebastián Claros · Álvaro Javier Bermúdez</strong><br>Nexus Ingeniería</p>`,
  },
  {
    id: "contrato",
    name: "Contrato de prestación de servicios",
    desc: "Base de contrato (revísalo con un abogado antes de usarlo).",
    variables: [V.cliente, V.documento, V.proyecto, V.valor, V.plazo, V.ciudad, V.fecha],
    html: `
<p>Entre <strong>{cliente}</strong>, identificado(a) con {documento}, en adelante EL CONTRATANTE, y <strong>Nexus Ingeniería</strong>, representada por Sebastián Claros y Álvaro Javier Bermúdez, en adelante EL CONTRATISTA, se celebra el presente contrato, que se rige por las siguientes cláusulas:</p>
<h3>Primera. Objeto</h3>
<p>EL CONTRATISTA se obliga a desarrollar el proyecto <strong>{proyecto}</strong>, según la propuesta aceptada por EL CONTRATANTE, que hace parte de este contrato.</p>
<h3>Segunda. Plazo</h3>
<p>El plazo de ejecución es de {plazo}, contado desde la firma de este contrato y el pago del anticipo.</p>
<h3>Tercera. Valor y forma de pago</h3>
<p>El valor total es de {valor}, pagadero así: 50 % como anticipo y 50 % a la entrega.</p>
<h3>Cuarta. Obligaciones del contratista</h3>
<ul><li>Ejecutar el objeto con calidad y en el plazo pactado.</li><li>Entregar capacitación y manual de uso.</li><li>Guardar reserva sobre la información del contratante.</li></ul>
<h3>Quinta. Obligaciones del contratante</h3>
<ul><li>Pagar el valor en los plazos pactados.</li><li>Entregar a tiempo la información y aprobaciones requeridas.</li></ul>
<h3>Sexta. Propiedad del resultado</h3>
<p>Una vez pagado el valor total, el resultado del proyecto pasa a ser propiedad de EL CONTRATANTE.</p>
<h3>Séptima. Terminación</h3>
<p>Cualquiera de las partes puede terminar el contrato por incumplimiento de la otra, avisando por escrito con 15 días de anticipación.</p>
<p>Para constancia, se firma en {ciudad} el {fecha}.</p>`,
  },
  {
    id: "acta",
    name: "Acta de entrega",
    desc: "Constancia de lo que se entregó y quedó funcionando.",
    variables: [V.cliente, V.proyecto, V.fecha],
    html: `
<p><strong>Cliente:</strong> {cliente}<br><strong>Proyecto:</strong> {proyecto}<br><strong>Fecha de entrega:</strong> {fecha}</p>
<h2>Elementos entregados</h2>
<table><tbody>
<tr><th><p>Elemento</p></th><th><p>Estado</p></th><th><p>Observaciones</p></th></tr>
<tr><td><p>Plataforma publicada</p></td><td><p>Funcionando</p></td><td><p></p></td></tr>
<tr><td><p>Accesos y contraseñas entregados</p></td><td><p>Entregado</p></td><td><p></p></td></tr>
<tr><td><p>Manual de uso</p></td><td><p>Entregado</p></td><td><p></p></td></tr>
<tr><td><p>Capacitación</p></td><td><p>Realizada</p></td><td><p></p></td></tr>
</tbody></table>
<h2>Soporte</h2>
<p>El proyecto incluye un mes de soporte desde esta fecha para corregir fallas de funcionamiento.</p>
<p>Con la firma de esta acta, el cliente declara recibir a satisfacción los elementos listados.</p>`,
  },
  {
    id: "manual",
    name: "Manual de uso",
    desc: "Guía paso a paso para el cliente.",
    variables: [V.cliente, V.proyecto],
    html: `
<p>Preparado para <strong>{cliente}</strong> · {proyecto}</p>
<h1>Primeros pasos</h1>
<p>Explique cómo entrar y qué se ve al iniciar.</p>
<ol><li>Abra la dirección del sistema.</li><li>Escriba su correo y contraseña.</li><li>Haga clic en Iniciar sesión.</li></ol>
<h1>Tareas frecuentes</h1>
<h2>Tarea 1</h2>
<p>Pasos cortos, con los mismos nombres de los botones.</p>
<h1>Preguntas frecuentes</h1>
<p><strong>¿Qué hago si olvido la contraseña?</strong> Use la opción «¿Olvidaste tu contraseña?».</p>`,
  },
  {
    id: "cuenta-cobro",
    name: "Cuenta de cobro",
    desc: "Cobro por servicios prestados.",
    variables: [V.cliente, V.documento, V.proyecto, V.valor, V.ciudad, V.fecha],
    html: `
<p>{ciudad}, {fecha}</p>
<p><strong>{cliente}</strong><br>{documento}</p>
<h2>DEBE A</h2>
<p><strong>Nexus Ingeniería</strong></p>
<h2>LA SUMA DE</h2>
<p><strong>{valor}</strong></p>
<h2>POR CONCEPTO DE</h2>
<p>Servicios prestados en el proyecto {proyecto}.</p>
<table><tbody>
<tr><th><p>Descripción</p></th><th><p>Valor</p></th></tr>
<tr><td><p>Servicio</p></td><td><p>{valor}</p></td></tr>
</tbody></table>
<p>Favor consignar a la cuenta: (banco, tipo y número de cuenta).</p>
<p>Atentamente,</p>
<p><strong>Nexus Ingeniería</strong></p>`,
  },
];

export function getTemplate(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

/** Variables que aparecen en el texto como {nombre}. */
export function detectVariables(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/\{([a-z0-9_áéíóúñ]+)\}/gi)) found.add(m[1].toLowerCase());
  return [...found];
}
