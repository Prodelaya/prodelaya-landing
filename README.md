# 🌐 Prodelaya Landing

Landing page personal de **Pablo Laya**, estudiante de DAM/DAW y desarrollador backend especializado en **Python**, **automatización**, **scraping** e **integración de IA**.  
El proyecto sirve como carta de presentación y punto de acceso central a sus proyectos públicos y redes profesionales.

---

## 🚀 Descripción General

**Prodelaya Landing** es una web estática moderna construida con **HTML, CSS y JavaScript puros**, enfocada en la claridad visual, el rendimiento y la accesibilidad.  
El sitio está desplegado en **Cloudflare Pages** con dominio personalizado [`prodelaya.dev`](https://prodelaya.dev), e integra animaciones, modales interactivos y un diseño responsive adaptado a todos los dispositivos.

---

## 🛠️ Tecnologías Utilizadas

| Categoría | Tecnologías / Librerías |
|------------|--------------------------|
| **Frontend** | HTML5, CSS3 (variables, grid, animaciones), JavaScript (DOM API nativa) |
| **Fuentes e iconos** | Google Fonts (Inter), Font Awesome 6 |
| **Animaciones** | AOS (Animate On Scroll) |
| **Infraestructura** | Cloudflare Pages + GitHub CI/CD |
| **Dominio y DNS** | Cloudflare (modo “Solo DNS”) con dominio `prodelaya.dev` |
| **SEO / Social Media** | Metadatos Open Graph + descripción optimizada |

---

## 🧩 Estructura del Proyecto

```
📦 prodelaya-landing
 ┣ 📜 Index.html       → Estructura principal del sitio (3 secciones + footer)
 ┣ 🎨 styles.css       → Tema oscuro modular, responsive y con variables CSS
 ┣ ⚙️ script.js         → Tipado animado, modal de email y notificaciones toast
 ┗ 📁 /assets (opcional) → Recursos gráficos futuros (logos, screenshots, etc.)
```

---

## ⚡ Funcionalidades Principales

- **Efecto de escritura dinámica** en el subtítulo principal.
- **Animaciones AOS** al hacer scroll.
- **Modal interactivo de contacto** con copia al portapapeles y notificación toast.
- **Diseño responsive** y escalable hasta 4K.
- **Tech Stack visual** con íconos y animaciones.
- **Timeline de proyectos destacados** con enlaces directos a GitHub y demos online.

---

## 🌍 Despliegue y Configuración

El proyecto se despliega automáticamente con cada commit en el repositorio de GitHub mediante **Cloudflare Pages**:

1. **Repositorio vinculado**: GitHub → Cloudflare Pages  
2. **Branch principal:** `main`  
3. **Build command:** *(vacío, sitio estático)*  
4. **Output directory:** `/`  
5. **Custom Domain:** [`prodelaya.dev`](https://prodelaya.dev)

### 🔐 Certificado SSL

Cloudflare emite un **certificado gratuito** Let’s Encrypt tras la verificación del dominio.  
El sitio está servido íntegramente bajo **HTTPS**.

---

## 🧠 Problemas y Soluciones Durante el Despliegue

| Problema | Causa | Solución Aplicada |
|-----------|--------|-------------------|
| ❌ **404 Not Found** al publicar | Archivo `Index.html` con mayúscula | Renombrado a `index.html` (Cloudflare Pages distingue mayúsculas) |
| ⚠️ **Error 522 (Connection timed out)** en `www.prodelaya.dev` | Configuración DNS parcial en subdominio | Añadido CNAME `www → prodelaya.pages.dev` y verificado dominio en Cloudflare |
| 🔒 SSL pendiente / no emitido | Dominio no verificado | Se verificó dominio raíz desde Pages y se activó HTTPS automático |
| 🌀 Cache inconsistente | Caché activa tras despliegue | Limpiada desde Cloudflare Dashboard tras cada build |

---

## 🧾 Licencia

Este proyecto se publica bajo licencia **MIT**, permitiendo libre uso, modificación y redistribución.

---

## 👤 Autor

**Pablo Laya**  
Desarrollador Backend Python | DAM/DAW Student  
📧 [proyectos.delaya@gmail.com](mailto:proyectos.delaya@gmail.com)  
🔗 [https://prodelaya.dev](https://prodelaya.dev)  
🐙 [GitHub: @Prodelaya](https://github.com/Prodelaya)

---

## 💡 Próximos Pasos

- Añadir versión con **backend real** (API + chatbot sobre datos personales).  
- Integrar **RAG con IA** para permitir consultas interactivas sobre el portfolio.  
- Incorporar sistema de métricas y visitas mediante Cloudflare Analytics.
