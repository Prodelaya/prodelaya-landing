// ========================================
// INICIALIZACIÓN AOS (Animate On Scroll)
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true,
        offset: 100
    });
});

// ========================================
// TYPING EFFECT
// ========================================
const typingText = document.getElementById('typing-text');
const phrases = [
    'Backend Python Developer',
    'Web Scraping Specialist',
    'Automation Enthusiast',
    'AI Integration Developer'
];

let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingSpeed = 100;

function typeEffect() {
    const currentPhrase = phrases[phraseIndex];
    
    if (isDeleting) {
        // Borrando caracteres
        typingText.textContent = currentPhrase.substring(0, charIndex - 1);
        charIndex--;
        typingSpeed = 50;
    } else {
        // Escribiendo caracteres
        typingText.textContent = currentPhrase.substring(0, charIndex + 1);
        charIndex++;
        typingSpeed = 100;
    }
    
    // Lógica de cambio de frase
    if (!isDeleting && charIndex === currentPhrase.length) {
        // Pausa al completar la frase
        typingSpeed = 2000;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        // Cambiar a la siguiente frase
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        typingSpeed = 500;
    }
    
    setTimeout(typeEffect, typingSpeed);
}

// Iniciar efecto al cargar
document.addEventListener('DOMContentLoaded', typeEffect);

// ========================================
// SMOOTH SCROLL
// ========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ========================================
// SCROLL INDICATOR HIDE
// ========================================
window.addEventListener('scroll', function() {
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        if (window.scrollY > 100) {
            scrollIndicator.style.opacity = '0';
        } else {
            scrollIndicator.style.opacity = '1';
        }
    }
});

// ========================================
// ANIMACIÓN DE NÚMEROS EN HERO (Opcional)
// ========================================
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        element.textContent = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// ========================================
// LAZY LOADING DE IMÁGENES (Si se agregan)
// ========================================
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ========================================
// PERFORMANCE: Reducir repaints en scroll
// ========================================
let ticking = false;

function updateOnScroll() {
    // Agregar lógica adicional si es necesario
    ticking = false;
}

window.addEventListener('scroll', function() {
    if (!ticking) {
        window.requestAnimationFrame(updateOnScroll);
        ticking = true;
    }
});

// ========================================
// DETECCIÓN DE NAVEGADOR (Fallbacks)
// ========================================
const isFirefox = typeof InstallTrigger !== 'undefined';
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

if (isFirefox || isSafari) {
    // Ajustes específicos de navegador si es necesario
    document.body.classList.add(isFirefox ? 'is-firefox' : 'is-safari');
}

// ========================================
// EMAIL MODAL + COPIAR AL PORTAPAPELES
// ========================================
const emailBtn = document.getElementById('emailBtn');
const emailModal = document.getElementById('emailModal');
const closeModal = document.getElementById('closeModal');
const copyEmailBtn = document.getElementById('copyEmailBtn');
const toast = document.getElementById('toast');

const EMAIL = 'proyectos.delaya@gmail.com';

// Abrir modal
emailBtn.addEventListener('click', () => {
    emailModal.classList.add('active');
});

// Cerrar modal (botón X)
closeModal.addEventListener('click', () => {
    emailModal.classList.remove('active');
});

// Cerrar modal (click fuera del contenido)
emailModal.addEventListener('click', (e) => {
    if (e.target === emailModal) {
        emailModal.classList.remove('active');
    }
});

// Cerrar modal con ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && emailModal.classList.contains('active')) {
        emailModal.classList.remove('active');
    }
});

// Copiar email al portapapeles
copyEmailBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(EMAIL);
        
        // Mostrar toast
        toast.classList.add('show');
        
        // Cerrar modal
        emailModal.classList.remove('active');
        
        // Ocultar toast después de 3s
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    } catch (err) {
        // Fallback para navegadores antiguos
        const textArea = document.createElement('textarea');
        textArea.value = EMAIL;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        // Mostrar toast igual
        toast.classList.add('show');
        emailModal.classList.remove('active');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});