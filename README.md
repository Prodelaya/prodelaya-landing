# Deploy en Cloudflare Pages

## Opción 1: Deploy automático desde GitHub (RECOMENDADO)

### 1. Subir código a GitHub
```bash
git init
git add index.html styles.css script.js
git commit -m "Initial commit: Landing portfolio"
git branch -M main
git remote add origin https://github.com/Prodelaya/prodelaya-landing.git
git push -u origin main
```

### 2. Conectar con Cloudflare Pages
1. Ir a [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. **Workers & Pages** → **Create Application** → **Pages** → **Connect to Git**
3. Seleccionar repositorio `prodelaya-landing`
4. Configuración de build:
   - **Framework preset:** None
   - **Build command:** (vacío)
   - **Build output directory:** `/`
5. **Save and Deploy**

### 3. Configurar dominio personalizado
1. En la página del proyecto → **Custom domains**
2. **Set up a custom domain** → `prodelaya.dev`
3. Cloudflare configurará el DNS automáticamente

**Tiempo estimado:** 2-3 minutos hasta que esté live

---

## Opción 2: Deploy manual (sin GitHub)

### 1. Preparar archivos
Asegúrate de tener en una carpeta:
```
portfolio/
├── index.html
├── styles.css
└── script.js
```

### 2. Deploy directo
1. **Cloudflare Dashboard** → **Workers & Pages** → **Create** → **Pages**
2. **Upload assets** (arrastrar carpeta)
3. **Deploy site**

### 3. Configurar dominio
(Igual que Opción 1, paso 3)

---

## Verificación Post-Deploy

### Checklist:
- [ ] HTTPS activo (certificado automático)
- [ ] Typing effect funciona
- [ ] Animaciones AOS se disparan al scroll
- [ ] Links externos abren en nueva pestaña
- [ ] Responsive en móvil (usar DevTools)
- [ ] Meta tags Open Graph (compartir en redes)

### Lighthouse Score esperado:
- Performance: 95-100
- Accessibility: 95-100
- Best Practices: 100
- SEO: 100

---

## Actualización de contenido

### Cambios rápidos:
```bash
# Editar archivos localmente
nano index.html  # o tu editor favorito

# Push a GitHub (deploy automático)
git add .
git commit -m "Update: descripción del cambio"
git push
```

**Cloudflare rebuildeará automáticamente en ~30 segundos.**

---

## Troubleshooting

### Problema: "Estilos no cargan"
**Causa:** Rutas relativas incorrectas  
**Solución:** Verificar que `styles.css` y `script.js` estén en la raíz

### Problema: "AOS no funciona"
**Causa:** Script carga antes que la librería  
**Solución:** Ya resuelto con `DOMContentLoaded` en script.js

### Problema: "Dominio no resuelve"
**Causa:** DNS propagation en curso  
**Solución:** Esperar 5-10 minutos, usar [whatsmydns.net](https://www.whatsmydns.net/)

---

## Optimizaciones futuras (v2.0)

- [ ] Minificar CSS/JS (Cloudflare lo hace automáticamente)
- [ ] Lazy load de Font Awesome (solo iconos usados)
- [ ] Service Worker para PWA
- [ ] Agregar analytics (Cloudflare Web Analytics gratuito)
