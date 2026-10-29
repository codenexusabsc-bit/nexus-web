"""Guía PDF para crear las cuentas de Nexus Ingeniería (para Álvaro)."""
import importlib.util
from PIL import Image, ImageDraw
import pymupdf

SELLOS = "/home/sebas/Escritorio/sellos"
spec = importlib.util.spec_from_file_location("p", f"{SELLOS}/presentacion.py")
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)
g = p.g

HERE = __file__.rsplit("/", 1)[0]
OUT = "/home/sebas/nexus-web/docs/Guia_cuentas_Nexus.pdf"
PW, PH, K, W, H = p.PW, p.PH, p.K, p.W, p.H
px = p.px
CORREO = "codenexus.absc@gmail.com"

CSS = p.CSS + """
body {font-size: 10.5pt;}
h1 {font-family: ubb; font-size: 17pt; color: #0e0a26; margin: 14pt 0 4pt 0;}
h2 {font-family: ubb; font-size: 12.5pt; color: #6d28d9; margin: 12pt 0 4pt 0;}
p {margin: 0 0 6pt 0;}
ol, ul {margin: 0 0 6pt 0;}
li {margin: 0 0 4pt 0;}
a {color: #2563eb; text-decoration: underline;}
code {font-family: mono; color: #6d28d9;}
table {width: 100%; border-collapse: collapse; margin: 4pt 0 8pt 0;}
td, th {border: 1px solid #ddd6fe; padding: 5pt; vertical-align: top; font-size: 10pt;}
th {font-family: ubb; color: #6d28d9; text-align: left; border-bottom: 2px solid #a78bfa;}
.paso {font-family: ubb; color: #0e0a26;}
.ojo td {border: 2px solid #fb923c;}
.ojo b {color: #c2410c;}
.tip td {border: 2px solid #22d3ee;}
.tip b {color: #0e7490;}
.alto td {border: 2px solid #f87171;}
.alto b {color: #b91c1c;}
.box {font-size: 15pt; color: #6d28d9;}
"""
CSS = CSS.replace("@font-face {{", "@font-face {").replace(";}}", ";}")
CSS += "@font-face {font-family: mono; src: url(NotoSansMono-Regular.ttf);}"


def nota(cls, titulo, texto):
    return f"<table class='{cls}'><tr><td><b>{titulo}</b> {texto}</td></tr></table>"


def link(url, txt=None):
    return f"<a href='{url}'>{txt or url}</a>"


BOX = "<span class='box'>☐</span>"

HTML = f"""
<h1>Antes de empezar</h1>
<p>Hola, Álvaro. Esta guía te lleva paso a paso para crear las cuentas que necesita la nueva plataforma web de
<b>Nexus Ingeniería</b>. Son 6 cuentas y toma más o menos <b>1 hora</b>. No tienes que programar nada: solo
registrarte, confirmar correos y guardar contraseñas.</p>

<table>
<tr><th>Dato</th><th>Valor</th></tr>
<tr><td>Correo de todas las cuentas</td><td><b>{CORREO}</b></td></tr>
<tr><td>Nombre de la empresa</td><td>Nexus Ingeniería</td></tr>
<tr><td>Plan en todos los sitios</td><td><b>Gratis (Free)</b>. Ninguno debe pedir tarjeta.</td></tr>
<tr><td>Usuario sugerido (GitHub)</td><td><code>codenexus</code> · si está ocupado: <code>codenexus-co</code> o <code>nexus-ingenieria</code></td></tr>
</table>

{nota("alto", "Regla de oro:", "si algún sitio te pide <b>tarjeta de crédito</b>, un plan de pago o una "
      "\"prueba gratis\", <b>detente</b> y escríbele a Sebastián. Con lo que vamos a crear no debería pasar.")}

<h2>Lo que necesitas tener a mano</h2>
<ul>
<li>Un computador con Google Chrome.</li>
<li>Tu celular, para los códigos de verificación.</li>
<li>La contraseña del Gmail de Nexus. <b>Pídesela a Sebastián en persona o por llamada</b>, no por chat.</li>
</ul>

<h1>Cómo crear las contraseñas</h1>
<p>Esta guía <b>no trae contraseñas escritas a propósito</b>: un PDF se reenvía, se queda en descargas y
se puede filtrar. En su lugar, vas a crear las contraseñas con un gestor y quedan guardadas ahí para los dos socios.</p>
<table>
<tr><th>Tipo</th><th>Cómo debe ser</th><th>Ejemplo del formato (NO lo uses)</th></tr>
<tr><td>Contraseña maestra de Bitwarden (la única que hay que memorizar)</td>
<td>Frase de 5 palabras al azar separadas por guiones, más un número. Mínimo 25 caracteres.</td>
<td><code>cometa-lapiz-rio-ventana-mango-47</code></td></tr>
<tr><td>Contraseñas de GitHub, Supabase, Netlify, Resend</td>
<td>Generadas por Bitwarden: <b>20 caracteres</b>, con mayúsculas, minúsculas, números y símbolos. Una distinta por sitio.</td>
<td><code>q7#Lm2!vR9@xT4$zK8&amp;w</code></td></tr>
<tr><td>Contraseña de la base de datos de Supabase</td>
<td>Generada por Bitwarden, <b>24 caracteres, solo letras y números</b> (los símbolos dan problemas en el código).</td>
<td><code>Vb7Qx2Lm9Rt4Kp8Wz3Nc6Hd</code></td></tr>
</table>
{nota("tip", "Truco:", "en casi todos los pasos puedes entrar con el botón <b>\"Continuar con GitHub\"</b>. "
      "Así esas cuentas no necesitan contraseña propia: dependen de GitHub, que queda bien protegido.")}

<h1>Paso 1 · Perfil de Chrome solo para Nexus</h1>
<p>Sirve para que las cuentas de Nexus no se mezclen con otras sesiones (por ejemplo, otro GitHub abierto).</p>
<ol>
<li>En Chrome, haz clic en tu <b>foto de perfil</b> (arriba a la derecha).</li>
<li>Elige <b>Agregar</b> → <b>Continuar sin una cuenta</b>.</li>
<li>Nombre del perfil: <b>Nexus</b>. Elige un color morado. Clic en <b>Listo</b>.</li>
<li>Haz <b>todos los pasos siguientes</b> en esa ventana de Chrome.</li>
</ol>

<h1>Paso 2 · Entrar al Gmail de Nexus</h1>
<ol>
<li>Abre {link("https://mail.google.com")} y entra con <b>{CORREO}</b> y la contraseña que te dio Sebastián.</li>
<li>Deja esta pestaña abierta: aquí llegan los correos de confirmación de cada sitio.</li>
<li>Si Google pide confirmar que eres tú, Sebastián recibirá un aviso o código en su celular: coordínalo con él.</li>
</ol>

<h1>Paso 3 · Bitwarden (gestor de contraseñas)</h1>
<p>Aquí quedan guardadas todas las contraseñas y los códigos de recuperación. Es gratis.</p>
<ol>
<li>Entra a {link("https://vault.bitwarden.com/#/register")}.</li>
<li>Si pregunta la región, elige <b>bitwarden.com (Estados Unidos)</b>.</li>
<li>Correo: <b>{CORREO}</b>. Nombre: <b>Nexus Ingeniería</b>.</li>
<li>Crea la <b>contraseña maestra</b> con el formato de frase de la tabla anterior. Escríbela <b>en papel</b> y
entrégasela a Sebastián en persona. <b>Si se pierde, no hay forma de recuperarla.</b></li>
<li>Pista de contraseña: déjala vacía.</li>
<li>Confirma el correo desde Gmail.</li>
<li>Instala la extensión de Chrome desde {link("https://bitwarden.com/download/", "bitwarden.com/download")}
(sección <b>Navegador web</b> → Chrome) e inicia sesión en ella.</li>
<li>Crea una carpeta llamada <b>Nexus</b>. Todo lo que guardes en los pasos siguientes va ahí.</li>
</ol>
{nota("tip", "Generar contraseñas:", "en la extensión de Bitwarden, pestaña <b>Generador</b>. Ajusta la longitud, "
      "copia la contraseña y pégala en el sitio. Al terminar el registro, Bitwarden ofrece guardarla: dile que sí.")}

<h1>Paso 4 · GitHub (donde se guarda el código)</h1>
<ol>
<li>Entra a {link("https://github.com/signup")}.</li>
<li>Correo: <b>{CORREO}</b>.</li>
<li>Contraseña: genera una de 20 caracteres con Bitwarden.</li>
<li>Usuario (username): <code>codenexus</code>. Si está ocupado: <code>codenexus-co</code> o <code>nexus-ingenieria</code>.</li>
<li>Preferencias de correo: puedes desmarcarlas. Resuelve el acertijo de verificación.</li>
<li>GitHub envía un <b>código de 8 dígitos</b> al Gmail: cópialo en la página.</li>
<li>Si pregunta para qué lo usarás: <b>Just me</b> / equipo pequeño. Plan: <b>Free</b>. Si ofrece prueba de Copilot o Team: <b>no aceptes</b>.</li>
</ol>
<h2>Activar la verificación en dos pasos (obligatorio en GitHub)</h2>
<ol>
<li>Instala en tu celular <b>Google Authenticator</b> (Play Store o App Store).</li>
<li>En GitHub: foto de perfil → <b>Settings</b> → <b>Password and authentication</b> → <b>Enable two-factor authentication</b>.</li>
<li>Escanea el código QR con Google Authenticator y escribe el código de 6 dígitos que aparece.</li>
<li>GitHub muestra los <b>códigos de recuperación (recovery codes)</b>: clic en <b>Download</b> y cópialos en
la nota de GitHub dentro de Bitwarden. Sin ellos, si pierdes el celular, se pierde la cuenta.</li>
</ol>
{nota("ojo", "No crees ningún repositorio.", "Lo hacemos juntos al empezar el proyecto.")}

<h1>Paso 5 · Supabase (base de datos y usuarios)</h1>
<ol>
<li>Entra a {link("https://supabase.com/dashboard/sign-up")}.</li>
<li>Clic en <b>Continue with GitHub</b> → <b>Authorize supabase</b>. Revisa que sea la cuenta <code>codenexus</code>.</li>
<li>Crea la organización:
<ul><li>Name: <b>Nexus Ingeniería</b></li>
<li>Type: <b>Company</b></li>
<li>Plan: <b>Free - $0/month</b></li></ul></li>
<li>Clic en <b>Create organization</b>.</li>
</ol>
{nota("ojo", "Aquí te detienes.", "No crees el proyecto (\"New project\"): lo hacemos juntos para elegir la "
      "región correcta y guardar la contraseña de la base de datos.")}

<h1>Paso 6 · Netlify (donde se publica la página)</h1>
<ol>
<li>Entra a {link("https://app.netlify.com/signup")}.</li>
<li>Clic en <b>Sign up with GitHub</b> → autoriza con la cuenta <code>codenexus</code>.</li>
<li>En las preguntas de bienvenida: uso <b>Work</b>, rol <b>Developer</b>, proyecto <b>Website</b> (o lo más parecido).</li>
<li>Nombre del equipo (team): <b>Nexus Ingeniería</b>. Plan: <b>Free / Starter</b>.</li>
<li>Si te ofrece desplegar un proyecto de ejemplo: <b>sáltalo</b> (Skip).</li>
</ol>

<h1>Paso 7 · Resend (correos automáticos)</h1>
<ol>
<li>Entra a {link("https://resend.com/signup")}.</li>
<li>Clic en <b>Continue with GitHub</b> → autoriza con <code>codenexus</code>.</li>
<li>Plan: <b>Free</b>. Si pregunta por un dominio: sáltalo, todavía no tenemos.</li>
<li>No crees la API key por ahora.</li>
</ol>

<h1>Paso 8 · Revisión final</h1>
<p>Marca cada casilla cuando termines. Todo lo marcado como \"guardado\" debe estar en la carpeta <b>Nexus</b> de Bitwarden.</p>
<table>
<tr><th>Cuenta</th><th>Sitio</th><th>Cómo se entra</th><th>Creada</th><th>Guardada</th></tr>
<tr><td>Bitwarden</td><td>vault.bitwarden.com</td><td>Correo + contraseña maestra</td><td>{BOX}</td><td>En papel</td></tr>
<tr><td>GitHub</td><td>github.com</td><td>Correo + contraseña + código del celular</td><td>{BOX}</td><td>{BOX}</td></tr>
<tr><td>Códigos de recuperación GitHub</td><td>—</td><td>—</td><td>{BOX}</td><td>{BOX}</td></tr>
<tr><td>Supabase</td><td>supabase.com</td><td>Continue with GitHub</td><td>{BOX}</td><td>—</td></tr>
<tr><td>Netlify</td><td>netlify.com</td><td>Sign up with GitHub</td><td>{BOX}</td><td>—</td></tr>
<tr><td>Resend</td><td>resend.com</td><td>Continue with GitHub</td><td>{BOX}</td><td>—</td></tr>
</table>

<h2>Qué le envías a Sebastián al terminar</h2>
<ol>
<li>El <b>usuario de GitHub</b> que quedó (por ejemplo, <code>codenexus</code>).</li>
<li>El papel con la <b>contraseña maestra de Bitwarden</b>, en persona.</li>
<li>Tu <b>correo personal</b>, para crear tu usuario del panel de Nexus.</li>
<li>Un mensaje confirmando que <b>ningún sitio pidió tarjeta</b>.</li>
</ol>

<h1>Si algo sale mal</h1>
<table>
<tr><th>Problema</th><th>Qué hacer</th></tr>
<tr><td>El usuario de GitHub está ocupado</td><td>Prueba <code>codenexus-co</code>, <code>nexus-ingenieria</code> o <code>nexusingenieria</code>.</td></tr>
<tr><td>No llega el correo de confirmación</td><td>Revisa <b>Spam</b> y <b>Promociones</b> en Gmail; espera 5 minutos y pide reenviar.</td></tr>
<tr><td>Supabase o Netlify entran con otro GitHub</td><td>Cierra sesión en github.com, entra con <code>codenexus</code> y repite el paso desde el perfil de Chrome \"Nexus\".</td></tr>
<tr><td>Algún sitio pide tarjeta o plan de pago</td><td><b>Detente</b> y avísale a Sebastián.</td></tr>
<tr><td>Las pantallas no se ven igual que aquí</td><td>Es normal: los sitios cambian sus botones. Busca la opción equivalente o pregunta.</td></tr>
</table>
"""

CONTENT_RECT = pymupdf.Rect(48, 82, PW - 48, PH - 56)


def portada(doc):
    im = Image.new("RGBA", (W, H), g.NAVY)
    d = ImageDraw.Draw(im)
    p.starfield(d, 10, 10, W - 10, H - 10, 110, 31)
    cx, cy = W // 2, px(290)
    g.orbit(d, cx, cy, px(230), px(72), 6, g.P2, dash=3, rot_deg=-16)
    g.real_portal(im, cx, cy, px(100), px(132))
    g.planet(d, cx + px(165), cy - px(100), 46, 6, g.TEAL, g.TEAL2, ring=g.P5)
    g.planet(d, cx - px(205), cy + px(45), 34, 6, g.ORANGE, g.ORANGE2)
    g.planet(d, cx + px(130), cy + px(130), 22, 6, g.PINK, g.PINK2)
    g.draw_text_center(d, "NEXUS", cx, px(470), 26, g.WHITE, font=g.BIG)
    g.draw_text_center(d, "INGENIERÍA", cx, px(540), 7, g.CYAN, gap=2)
    by = px(590)
    d.rectangle([px(90), by, W - px(90), by + px(34)], fill=g.P3)
    d.rectangle([px(90), by + px(34), W - px(90), by + px(34) + 9], fill=g.DEEP)
    g.draw_text_center(d, "GUÍA DE CREACIÓN DE CUENTAS", cx, by + px(17) - 21, 6, g.WHITE, gap=1)
    page = p.new_page(doc, im)
    p.html(page, (70, 650, PW - 70, 720),
           "<span class='w'>Paso a paso para dejar listas las cuentas de la plataforma web: "
           "Gmail, Bitwarden, GitHub, Supabase, Netlify y Resend.</span>", 11.5, "center")
    p.html(page, (70, 760, PW - 70, 810),
           "<span class='c'>Para <b class='c'>Álvaro</b> &nbsp;·&nbsp; Preparado por Sebastián Claros "
           "&nbsp;·&nbsp; 29 de octubre de 2026<br/>Documento interno: no reenviar</span>", 9.5, "center")


def fondo_interior(n):
    im = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    d = ImageDraw.Draw(im)
    p.header(im, d, n)
    p.footer(d, n, 0)
    return im


def main():
    # 1) contenido fluido con Story en un PDF temporal
    story = pymupdf.Story(html=f"<body>{HTML}</body>", user_css=CSS, archive=p.ARCH)
    tmp = f"{HERE}/_contenido.pdf"
    writer = pymupdf.DocumentWriter(tmp)
    more = True
    while more:
        dev = writer.begin_page(pymupdf.Rect(0, 0, PW, PH))
        more, _ = story.place(CONTENT_RECT)
        story.draw(dev)
        writer.end_page()
    writer.close()
    content = pymupdf.open(tmp)
    # 2) documento final: portada + fondo Nexus bajo cada página de contenido
    doc = pymupdf.open()
    portada(doc)
    for i in range(content.page_count):
        page = p.new_page(doc, fondo_interior(i + 2))
        page.show_pdf_page(page.rect, content, i)
        for l in content[i].get_links():
            page.insert_link(l)
        p.html(page, (40, PH - 30, PW - 40, PH - 14),
               f"<span class='m'>Nexus Ingeniería · Guía de creación de cuentas &nbsp;&nbsp;|&nbsp;&nbsp; {i + 2}</span>",
               8, "center")
    doc.set_metadata({"title": "Guía de creación de cuentas — Nexus Ingeniería", "author": "Nexus Ingeniería"})
    doc.save(OUT, garbage=4, deflate=True)
    import glob, os
    os.remove(tmp)
    for f in glob.glob(f"{SELLOS}/_bg_*.png"):
        os.remove(f)
    print("ok", OUT, doc.page_count)


if __name__ == "__main__":
    main()
