"""Manual de usuario del panel de Nexus Ingeniería (para Álvaro), en PDF con la plantilla Nexus."""
import importlib.util
from PIL import Image, ImageDraw
import pymupdf

HERE = __file__.rsplit("/", 1)[0]
spec = importlib.util.spec_from_file_location("gc", f"{HERE}/guia_cuentas.py")
gc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gc)
p, g = gc.p, gc.g
nota, link = gc.nota, gc.link

OUT = f"{HERE}/Manual_usuario_Panel_Nexus.pdf"
PW, PH, W, H, px = gc.PW, gc.PH, gc.W, gc.H, gc.px
SITE = "https://nexus-ingenieria1.netlify.app"

CSS = gc.CSS + """
h1 {page-break-before: always;}
h1.first {page-break-before: avoid;}
.k {font-family: ubb; color: #6d28d9;}
.num td {border: none; padding: 2pt 4pt;}
"""


def b(text):
    """Nombre de botón o sección tal como aparece en pantalla."""
    return f"<span class='k'>&nbsp;{text}&nbsp;</span>"


HTML = f"""
<h1 class="first">Bienvenido al panel</h1>
<p>Hola, Álvaro. Este manual explica, paso a paso, cómo usar el panel de <b>Nexus Ingeniería</b>: el lugar donde
tenemos la agenda, los proyectos y archivos, los documentos, las firmas, los clientes, las cotizaciones y la
página web. Funciona desde el computador y desde el celular.</p>
<p>No necesitas saber nada técnico. Los nombres de los botones aparecen así: {b("Guardar")}, igual que en la pantalla.</p>
<table>
<tr><th>Lo que necesitas</th><th>Dónde está</th></tr>
<tr><td>Dirección del panel</td><td><b>{link(SITE + "/login", "nexus-ingenieria1.netlify.app/login")}</b></td></tr>
<tr><td>Tu usuario</td><td><b>alvarojavierbr2000@gmail.com</b></td></tr>
<tr><td>Tu contraseña</td><td>La que te entregó Sebastián. Guárdala en Bitwarden.</td></tr>
<tr><td>Página pública de Nexus</td><td>{link(SITE)}</td></tr>
</table>
{nota("tip", "Consejo:", "en el celular, abre el panel en Chrome y usa el menú ⋮ → <b>Agregar a la pantalla principal</b>. Queda como una app con el ícono del agujero negro.")}

<h1>1. Entrar y salir</h1>
<h2>Entrar</h2>
<ol>
<li>Abre {link(SITE + "/login")}.</li>
<li>Escribe tu correo y tu contraseña.</li>
<li>Haz clic en {b("Iniciar sesión")}. Llegas a la <b>Agenda</b>, que es el inicio del panel.</li>
</ol>
<h2>Salir</h2>
<p>Abajo a la izquierda, junto a tu nombre, está el ícono de salida. Úsalo siempre que entres desde un computador que no sea tuyo.</p>
<h2>Si olvidas la contraseña</h2>
<ol>
<li>En la pantalla de entrada, haz clic en {b("¿Olvidaste tu contraseña?")}.</li>
<li>Escribe tu correo y pide el enlace. Te llega un correo para crear una contraseña nueva (mínimo 12 caracteres).</li>
</ol>
{nota("ojo", "Importante:", "mientras no tengamos correo propio, ese mensaje puede no llegar. Si no te llega en 10 minutos (revisa Spam), pídele a Sebastián que te la cambie desde Supabase.")}

<h1>2. Cómo está organizado</h1>
<p>A la izquierda está el <b>menú</b> con todas las funciones. En el celular se abre con el botón ☰ arriba a la derecha.</p>
<table>
<tr><th>Sección del menú</th><th>Para qué sirve</th></tr>
<tr><td>{b("Agenda")}</td><td>Calendario con recordatorios, mensajes entre nosotros y todo lo pendiente.</td></tr>
<tr><td>{b("Proyectos y carpeta")}</td><td>Archivos de cada proyecto, versiones, papelera y tareas.</td></tr>
<tr><td>{b("Solicitudes")}</td><td>Pedirle un documento al socio y entregarlo.</td></tr>
<tr><td>{b("Sitio web y mensajes")}</td><td>Editar la página pública y ver lo que escriben los clientes.</td></tr>
<tr><td>{b("Prospectos")}</td><td>Clientes interesados, desde el primer mensaje hasta que se gana.</td></tr>
<tr><td>{b("Cotizaciones y cobros")}</td><td>Cotizar, enviar a firmar y hacer cuentas de cobro.</td></tr>
<tr><td>{b("Documentos")}</td><td>Escribir documentos con la plantilla Nexus y sacar el PDF.</td></tr>
<tr><td>{b("Firmas")}</td><td>Firmar documentos y enviarlos a firmar a clientes.</td></tr>
<tr><td>{b("Piezas para redes")}</td><td>Imágenes para Instagram, Facebook y WhatsApp.</td></tr>
<tr><td>{b("Kit de marca")}</td><td>Logos, colores, firma de correo y tarjeta digital.</td></tr>
<tr><td>{b("Logos y sellos")}</td><td>Panel lateral para descargar logos y sellos rápido.</td></tr>
</table>

<h1>3. Agenda</h1>
<p>Es lo primero que ves al entrar. A un lado está el <b>calendario</b> y al otro los <b>Pendientes</b>: lo que necesita tu atención hoy.</p>
<h2>Los pendientes</h2>
<p>Arriba aparece el total de cosas por atender. Debajo, por grupos: mensajes de Sebastián sin leer, entregas que debes
revisar, documentos que te piden, tus recordatorios y tareas de hoy o atrasados, seguimientos a prospectos y mensajes
nuevos de la página. Lo atrasado se marca en <b>rojo</b>. Los botones {b("Leído")} y {b("Hecho")} lo quitan de la lista.</p>
<h2>Agendar un recordatorio</h2>
<ol>
<li>Haz clic en un día del calendario (o en {b("Recordatorio")}).</li>
<li>Elige el tipo: {b("Para mí")} (solo tú lo ves) o {b("Compartido")} (lo vemos los dos).</li>
<li>Escribe el título, la fecha y la hora (o marca <b>Todo el día</b>) y {b("Guardar")}.</li>
</ol>
<h2>Enviarle un mensaje a Sebastián</h2>
<ol>
<li>Haz clic en {b("Mensaje a mi socio")} (o en un día y elige {b("Mensaje")}).</li>
<li>Escribe qué necesitas, por ejemplo «Revisa la cotización de Bonett», elige la fecha y {b("Enviar")}.</li>
<li>A él le aparece resaltado en su calendario y en sus pendientes hasta que lo abre. Tú ves si ya lo leyó.</li>
</ol>
<h2>Otras cosas que puedes hacer</h2>
<ul>
<li><b>Mover</b> un recordatorio: arrástralo a otro día.</li>
<li><b>Marcar hecho</b>: ábrelo y usa {b("Marcar hecho")}; queda tachado.</li>
<li>Cambiar la vista con {b("Mes")}, {b("Semana")} o {b("Lista")}.</li>
<li>Las solicitudes de documentos, tareas con fecha y seguimientos a prospectos aparecen solos en el calendario.</li>
</ul>

<h1>4. Proyectos y carpeta compartida</h1>
<p>Cada cliente o tema tiene su <b>proyecto</b> con color. Dentro están sus <b>tareas</b> y sus <b>archivos</b>.</p>
<h2>Subir archivos</h2>
<ol>
<li>Entra al proyecto.</li>
<li>Arrastra los archivos al recuadro punteado (o haz clic en él para elegirlos). Hasta 50 MB por archivo.</li>
<li>Opcional: abre «Nota y etiquetas» antes de subir para ponerles una nota o etiquetas (Contrato, Factura…).</li>
</ol>
{nota("tip", "Versiones:", "si subes un archivo con el mismo nombre que uno existente, no lo reemplaza: se guarda como versión nueva (V2, V3…). Con el ícono de historial descargas cualquier versión anterior.")}
<h2>En cada archivo</h2>
<ul>
<li>Descargar, ver versiones, cambiar etiquetas o mover a la papelera.</li>
<li>Arriba puedes <b>buscar</b> por nombre y filtrar por etiqueta o por quién lo subió.</li>
<li>{b("Descargar ZIP")} baja todo el proyecto de una vez.</li>
</ul>
<h2>Papelera</h2>
<p>Lo que borras va a la {b("Papelera")} (botón en Proyectos y carpeta). Ahí se puede restaurar durante <b>30 días</b>; después se borra solo.</p>
<h2>Tareas del proyecto</h2>
<ol>
<li>En el proyecto, escribe la tarea en «Nueva tarea…», elige responsable y fecha, y {b("Agregar")}.</li>
<li>Arrastra la tarjeta entre {b("Por hacer")}, {b("En curso")} y {b("Hechas")}, o marca la casilla para terminarla.</li>
<li>Si tiene fecha y está a tu nombre, aparece en tu Agenda ese día.</li>
</ol>
<h2>Proyectos que ya no se usan</h2>
<ul>
<li>{b("Archivar")}: lo oculta sin borrar nada. Queda en «Archivados» al final de la lista y se puede {b("Restaurar")}.</li>
<li>{b("Borrar")}: lo elimina para siempre con sus archivos y tareas. Pide escribir el nombre del proyecto para confirmar.</li>
</ul>
{nota("ojo", "Mejor archivar que borrar:", "borrar no se puede deshacer.")}

<h1>5. Solicitudes de documentos</h1>
<p>Sirven para pedirle algo al socio («Necesito el RUT de Bonett») y que lo entregue ahí mismo.</p>
<h2>Pedir un documento</h2>
<ol>
<li>Ve a {b("Solicitudes")} → {b("Pedir un documento")}.</li>
<li>Escribe qué necesitas, elige el proyecto y, si quieres, una fecha límite. {b("Enviar solicitud")}.</li>
</ol>
<h2>Entregar lo que te piden</h2>
<ol>
<li>En «Me pidieron», busca la solicitud y haz clic en {b("Entregar documento")}.</li>
<li>Sube el archivo. Queda guardado en la carpeta del proyecto y la solicitud pasa a <b>Entregada</b>.</li>
</ol>
<h2>Revisar lo que te entregan</h2>
<p>En «Pedí yo»: {b("Aceptar")} si está bien, o {b("Devolver")} con un comentario de lo que falta. Las vencidas se ven en rojo.</p>

<h1>6. Sitio web y mensajes</h1>
<p>Desde aquí se cambia la página pública sin programar. <b>Nada cambia en la página hasta que publiques.</b></p>
<h2>Editar y publicar</h2>
<ol>
<li>Cambia los textos, servicios, equipo o contacto.</li>
<li>{b("Guardar borrador")}: guarda sin publicar (Sebastián también lo ve).</li>
<li>{b("Vista previa")}: abre la página tal como quedaría, con una franja naranja.</li>
<li>{b("Publicar")}: ahora sí cambian la página pública y el PDF de presentación.</li>
<li>{b("Descartar")}: vuelve a lo que está publicado.</li>
</ol>
<h2>Servicios y equipo</h2>
<ul>
<li>Servicios: cambia nombre, descripción y color, ocúltalos, ordénalos con las flechas o agrega nuevos.</li>
<li>Equipo: tu nombre, cargo, teléfono y correo. Estos dos últimos salen en tu <b>tarjeta digital</b>.</li>
</ul>
<h2>Mensajes de la página</h2>
<p>Lo que escriben los clientes en el formulario aparece arriba en «Mensajes de la página» y también en <b>Prospectos</b>.</p>

<h1>7. Prospectos</h1>
<p>Es el tablero de clientes interesados, en columnas: {b("Nuevos")}, {b("Contactados")}, {b("Cotizados")}, {b("Ganados")} y {b("Perdidos")}.
Los mensajes de la página entran solos en «Nuevos».</p>
<ol>
<li><b>Mover:</b> arrastra la tarjeta a la columna que corresponda.</li>
<li><b>Abrir la ficha:</b> haz clic en la tarjeta. Ahí están los botones de WhatsApp, llamar y correo.</li>
<li><b>Seguimiento:</b> pon un responsable, la <b>próxima acción</b> («Llamar para agendar reunión») con fecha y notas internas. {b("Guardar")}. Ese día aparece en la Agenda del responsable.</li>
<li><b>Cotizar:</b> {b("Crear cotización")} abre una cotización con los datos del cliente y lo pasa a «Cotizados».</li>
<li><b>Prospecto manual:</b> {b("Prospecto manual")} para alguien que llegó por WhatsApp, llamada o referido.</li>
</ol>

<h1>8. Cotizaciones y cuentas de cobro</h1>
<p>Arriba ves cuánto se cobró este mes, cuánto falta por cobrar y el total de cotizaciones aceptadas.</p>
<h2>Primero: datos de facturación (una sola vez)</h2>
<p>En la pestaña {b("Datos de facturación")} van a nombre de quién se cobra, la cédula o NIT, la ciudad, la cuenta para consignar y la forma de pago.</p>
<h2>Hacer una cotización</h2>
<ol>
<li>Pestaña {b("Cotizaciones")}: escribe el cliente y {b("Nueva cotización")}.</li>
<li>Agrega los ítems: descripción, cantidad y valor. El total se calcula solo (con descuento e IVA si aplican).</li>
<li>{b("Guardar")}.</li>
<li>{b("Crear documento para firmar")}: la pasa al editor de documentos, donde puedes ajustar el texto y {b("Enviar a firmar")} al cliente.</li>
</ol>
{nota("tip", "Automático:", "cuando el cliente firma la cotización, queda en estado «Aceptada» sola. Entonces aparece el botón «Crear cuenta de cobro».")}
<h2>Cuentas de cobro</h2>
<ol>
<li>Pestaña {b("Cuentas de cobro")} → {b("Nueva cuenta de cobro")}: cliente, concepto, valor y fecha.</li>
<li>{b("Generar PDF")} la abre en el editor con los datos de facturación, lista para descargar o enviar.</li>
<li>Cuando paguen, {b("Pagada")}. Si se equivocaron, se puede anular.</li>
</ol>

<h1>9. Documentos</h1>
<p>Es el editor tipo Overleaf, pero visual: escribes a la izquierda y a la derecha ves el <b>PDF con la plantilla de Nexus</b>, que se actualiza solo.</p>
<h2>Crear un documento</h2>
<ol>
<li>En {b("Documentos")}, elige una plantilla: en blanco, propuesta/cotización, contrato, acta de entrega, manual o cuenta de cobro.</li>
<li>Escribe el título arriba y elige el proyecto.</li>
<li>Llena los campos de arriba (cliente, valor, fecha…). Son las <b>variables</b>: en el texto aparecen como {{cliente}} y en el PDF se reemplazan por lo que escribas.</li>
<li>Escribe con la barra de formato: títulos, negrita, listas, tablas, alineación, salto de página.</li>
<li>{b("Guardar")} (o Ctrl+S). Cada vez que guardas queda una versión.</li>
</ol>
<h2>Después</h2>
<ul>
<li>{b("PDF")}: lo descarga.</li>
<li>{b("A la carpeta")}: guarda el PDF en la carpeta del proyecto.</li>
<li>{b("Versiones")}: vuelve a cualquier versión anterior.</li>
<li>{b("Enviar a firmar")}: ver la sección siguiente.</li>
</ul>
{nota("ojo", "Contrato:", "la plantilla de contrato es una base. Antes de usarla con un cliente, conviene que la revise un abogado.")}

<h1>10. Firmas electrónicas</h1>
<h2>Paso 1: guarda tu firma (una sola vez)</h2>
<p>En {b("Firmas")} → «Mi firma»: dibuja tu firma con el mouse o el dedo y {b("Guardar esta firma")}, o usa {b("Usar el sello E")}.</p>
<h2>Enviar un documento a firmar</h2>
<ol>
<li>Abre el documento, guárdalo y haz clic en {b("Enviar a firmar")}.</li>
<li>Marca los socios que firman y agrega a los clientes (nombre, cédula y correo).</li>
<li>{b("Enviar a firmar")}. El documento queda bloqueado mientras se firma (si te equivocas, {b("Cancelar")} lo devuelve a borrador).</li>
<li>Copia el <b>enlace del cliente</b> o envíaselo con {b("WhatsApp")}. Lo abre desde el celular, sin crear cuenta, y firma con el dedo.</li>
</ol>
{nota("ojo", "El enlace se muestra una sola vez.", "Si lo pierdes, usa «Generar enlace nuevo»: el anterior deja de servir. Los enlaces vencen a los 15 días.")}
<h2>Firmar tú</h2>
<p>Cuando te toca, aparece en {b("Firmas")} bajo «Te toca firmar». Abre la solicitud y haz clic en {b("Firmar ahora")}.</p>
<h2>Cuando firman todos</h2>
<p>El PDF se <b>sella solo</b>: cada página queda marcada y se agrega una hoja de <b>certificado</b> con quién firmó, fecha, hora,
IP y la huella del documento. El PDF firmado queda en la carpeta del proyecto y se descarga con {b("PDF firmado")}.</p>
{nota("tip", "Verificar:", f"cualquiera puede comprobar que un PDF firmado no fue modificado subiéndolo en {link(SITE + '/verificar', 'nexus-ingenieria1.netlify.app/verificar')}.")}

<h1>11. Piezas para redes</h1>
<ol>
<li>En {b("Piezas para redes")}, elige una plantilla: Servicios, Promoción, Proyecto entregado o Consejo.</li>
<li>Elige el formato: post, historia o estado de WhatsApp, cuadrado, portada de Facebook o foto de perfil.</li>
<li>Cambia los textos, el tema (oscuro o claro), el color y los planetas. La imagen se actualiza al instante.</li>
<li>{b("Descargar PNG")} para publicarla, o {b("Guardar en carpeta")} para dejarla en el proyecto Marca.</li>
</ol>

<h1>12. Kit de marca y tarjeta digital</h1>
<ul>
<li><b>Colores:</b> haz clic en un color para copiar su código.</li>
<li><b>Logos y sellos:</b> para descargar. Los sellos de firma solo se descargan con sesión iniciada.</li>
<li><b>Firma de correo:</b> elige tu nombre, {b("Copiar firma")} y pégala en Gmail → Configuración → Ver toda la configuración → General → Firma → Guardar cambios.</li>
<li><b>Tarjeta digital:</b> tu página {link(SITE + "/tarjeta/alvaro-javier-bermudez", "…/tarjeta/alvaro-javier-bermudez")} con WhatsApp, llamada, correo y «Guardar contacto». Descarga el QR para imprimirlo o compartirlo.</li>
</ul>

<h1>Hoja de referencia rápida</h1>
<table>
<tr><th>Quiero…</th><th>Así se hace</th></tr>
<tr><td>Entrar</td><td>{link(SITE + "/login", "…/login")} → correo y contraseña → {b("Iniciar sesión")}</td></tr>
<tr><td>Recordarme algo</td><td>Agenda → clic en el día → {b("Para mí")} → {b("Guardar")}</td></tr>
<tr><td>Avisarle algo a Sebastián</td><td>Agenda → {b("Mensaje a mi socio")}</td></tr>
<tr><td>Subir archivos</td><td>Proyectos y carpeta → proyecto → arrastrar al recuadro</td></tr>
<tr><td>Recuperar algo borrado</td><td>Proyectos y carpeta → {b("Papelera")} → restaurar</td></tr>
<tr><td>Pedir un documento</td><td>Solicitudes → {b("Pedir un documento")}</td></tr>
<tr><td>Cambiar la página web</td><td>Sitio web → editar → {b("Vista previa")} → {b("Publicar")}</td></tr>
<tr><td>Hacer seguimiento a un cliente</td><td>Prospectos → tarjeta → próxima acción con fecha</td></tr>
<tr><td>Cotizar</td><td>Cotizaciones → {b("Nueva cotización")} → ítems → {b("Crear documento para firmar")}</td></tr>
<tr><td>Cobrar</td><td>Cotizaciones → Cuentas de cobro → nueva → {b("Generar PDF")}</td></tr>
<tr><td>Escribir un documento</td><td>Documentos → plantilla → escribir → {b("Guardar")}</td></tr>
<tr><td>Que un cliente firme</td><td>Documento → {b("Enviar a firmar")} → enviar enlace por WhatsApp</td></tr>
<tr><td>Hacer una imagen para redes</td><td>Piezas para redes → plantilla → {b("Descargar PNG")}</td></tr>
<tr><td>Salir</td><td>Ícono de salida junto a tu nombre</td></tr>
</table>

<h2>Buenas prácticas</h2>
<ul>
<li>No compartas tu contraseña; si alguien la necesita, que tenga su propio usuario.</li>
<li>Cierra sesión en computadores ajenos.</li>
<li>Una firma electrónica tiene validez: firma solo lo que hayas leído.</li>
<li>Prefiere <b>archivar</b> en lugar de borrar.</li>
<li>Si algo no funciona o ves un error, toma una captura y envíasela a Sebastián.</li>
</ul>
"""


def portada(doc):
    im = Image.new("RGBA", (W, H), g.NAVY)
    d = ImageDraw.Draw(im)
    p.starfield(d, 10, 10, W - 10, H - 10, 110, 81)
    cx, cy = W // 2, px(290)
    g.orbit(d, cx, cy, px(230), px(72), 6, g.P2, dash=3, rot_deg=-16)
    g.real_portal(im, cx, cy, px(100), px(132))
    g.planet(d, cx + px(165), cy - px(100), 46, 6, g.TEAL, g.TEAL2, ring=g.P5)
    g.planet(d, cx - px(205), cy + px(45), 34, 6, g.ORANGE, g.ORANGE2)
    g.planet(d, cx + px(130), cy + px(130), 22, 6, g.PINK, g.PINK2)
    g.draw_text_center(d, "NEXUS", cx, px(470), 26, g.WHITE, font=g.BIG)
    g.draw_text_center(d, "INGENIERÍA", cx, px(540), 7, g.CYAN, gap=2)
    by = px(590)
    d.rectangle([px(110), by, W - px(110), by + px(34)], fill=g.P3)
    d.rectangle([px(110), by + px(34), W - px(110), by + px(34) + 9], fill=g.DEEP)
    g.draw_text_center(d, "MANUAL DE USO DEL PANEL", cx, by + px(17) - 21, 6, g.WHITE, gap=1)
    page = p.new_page(doc, im)
    p.html(page, (70, 650, PW - 70, 720),
           "<span class='w'>Agenda, proyectos, documentos, firmas, clientes, cotizaciones y página web: "
           "todo lo que necesitas saber, paso a paso.</span>", 11.5, "center")
    p.html(page, (70, 760, PW - 70, 810),
           "<span class='c'>Para <b class='c'>Álvaro Javier Bermúdez</b> &nbsp;·&nbsp; Versión 1.0 &nbsp;·&nbsp; "
           "29 de octubre de 2026<br/>Documento interno de Nexus Ingeniería</span>", 9.5, "center")


def main():
    story = pymupdf.Story(html=f"<body>{HTML}</body>", user_css=CSS, archive=p.ARCH)
    tmp = f"{HERE}/_contenido.pdf"
    writer = pymupdf.DocumentWriter(tmp)
    more = True
    while more:
        dev = writer.begin_page(pymupdf.Rect(0, 0, PW, PH))
        more, _ = story.place(gc.CONTENT_RECT)
        story.draw(dev)
        writer.end_page()
    writer.close()
    content = pymupdf.open(tmp)
    doc = pymupdf.open()
    portada(doc)
    for i in range(content.page_count):
        page = p.new_page(doc, gc.fondo_interior(i + 2))
        page.show_pdf_page(page.rect, content, i)
        for lk in content[i].get_links():
            page.insert_link(lk)
        p.html(page, (40, PH - 30, PW - 40, PH - 14),
               f"<span class='m'>Nexus Ingeniería · Manual de uso del panel &nbsp;&nbsp;|&nbsp;&nbsp; {i + 2}</span>", 8, "center")
    doc.set_metadata({"title": "Manual de uso del panel — Nexus Ingeniería", "author": "Nexus Ingeniería"})
    doc.save(OUT, garbage=4, deflate=True)
    import glob, os
    os.remove(tmp)
    for f in glob.glob(f"{gc.SELLOS}/_bg_*.png"):
        os.remove(f)
    print("ok", OUT, doc.page_count)


if __name__ == "__main__":
    main()
