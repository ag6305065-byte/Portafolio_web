// ===== MODAL DE CONTACTO =====
const modal = document.getElementById("contactModal");
const btn = document.getElementById("openContactBtn");
const closeBtn = document.getElementsByClassName("close-btn")[0];

btn.onclick = function() {
    modal.classList.add("show");
}

closeBtn.onclick = function() {
    modal.classList.remove("show");
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.classList.remove("show");
    }
}


// ===== CARRUSEL CON DETECCIÓN DE COLORES POR ZONAS Y MODAL =====
const track = document.querySelector('.carousel-track');
const slides = Array.from(track.children);
const nextButton = document.querySelector('.carousel-next');
const prevButton = document.querySelector('.carousel-prev');
const dotsContainer = document.querySelector('.carousel-indicators');
const dots = Array.from(dotsContainer.children);
const carouselSection = document.querySelector('#carousel');
const imageModal = document.getElementById('imageModal');
const expandedImg = document.getElementById('expandedImg');
const modalClose = document.querySelector('.image-modal-close');

// Capas de fondo para transiciones suaves
const bgLayer1 = document.getElementById('bg-layer-1');
const bgLayer2 = document.getElementById('bg-layer-2');
let currentBgLayer = bgLayer1;
let nextBgLayer = bgLayer2;

let currentIndex = 0;
let autoplayInterval;
const backgroundCache = {}; // Cache para los fondos de cada imagen

// Función mejorada para extraer colores de diferentes zonas de la imagen
function getZonalImageColors(imgElement, callback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Crear una nueva imagen para evitar problemas de CORS
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imgElement.src;
    
    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        try {
            const zones = {
                top: { y: 0, height: Math.floor(canvas.height * 0.33) },
                middle: { y: Math.floor(canvas.height * 0.33), height: Math.floor(canvas.height * 0.34) },
                bottom: { y: Math.floor(canvas.height * 0.67), height: Math.floor(canvas.height * 0.33) }
            };
            
            const zoneColors = {};
            
            // Extraer colores dominantes de cada zona
            for (let [zoneName, zone] of Object.entries(zones)) {
                const imageData = ctx.getImageData(0, zone.y, canvas.width, zone.height);
                const pixels = imageData.data;
                
                const colorMap = {};
                const sampleRate = 20; // Muestrear cada 20 píxeles para rendimiento
                
                for (let i = 0; i < pixels.length; i += 4 * sampleRate) {
                    const r = pixels[i];
                    const g = pixels[i + 1];
                    const b = pixels[i + 2];
                    const a = pixels[i + 3];
                    
                    // Ignorar píxeles transparentes
                    if (a < 128) continue;
                    
                    // Redondear a bloques de 25 para agrupar colores similares
                    const roundedR = Math.round(r / 25) * 25;
                    const roundedG = Math.round(g / 25) * 25;
                    const roundedB = Math.round(b / 25) * 25;
                    
                    const colorKey = `${roundedR},${roundedG},${roundedB}`;
                    colorMap[colorKey] = (colorMap[colorKey] || 0) + 1;
                }
                
                // Obtener los 3 colores más frecuentes de esta zona
                const topColors = Object.entries(colorMap)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(entry => {
                        const [r, g, b] = entry[0].split(',').map(Number);
                        return { r, g, b };
                    });
                
                // Calcular el color promedio ponderado de los colores dominantes
                if (topColors.length > 0) {
                    const avgColor = topColors.reduce((acc, color, idx) => {
                        const weight = 1 / (idx + 1); // Ponderar más los colores más dominantes
                        acc.r += color.r * weight;
                        acc.g += color.g * weight;
                        acc.b += color.b * weight;
                        acc.totalWeight += weight;
                        return acc;
                    }, { r: 0, g: 0, b: 0, totalWeight: 0 });
                    
                    zoneColors[zoneName] = {
                        r: Math.round(avgColor.r / avgColor.totalWeight),
                        g: Math.round(avgColor.g / avgColor.totalWeight),
                        b: Math.round(avgColor.b / avgColor.totalWeight)
                    };
                } else {
                    // Color gris por defecto
                    zoneColors[zoneName] = { r: 100, g: 100, b: 120 };
                }
            }
            
            callback(zoneColors);
            
        } catch (e) {
            console.error('Error al analizar la imagen:', e);
            // Colores por defecto en caso de error
            callback({
                top: { r: 90, g: 90, b: 122 },
                middle: { r: 62, g: 74, b: 94 },
                bottom: { r: 42, g: 53, b: 66 }
            });
        }
    };
    
    img.onerror = function() {
        // Colores por defecto si la imagen no carga
        callback({
            top: { r: 90, g: 90, b: 122 },
            middle: { r: 62, g: 74, b: 94 },
            bottom: { r: 42, g: 53, b: 66 }
        });
    };
}

// Crear gradiente vertical basado en los colores de las zonas
function createZonalGradient(zoneColors) {
    const { top, middle, bottom } = zoneColors;
    
    // Aplicar un ligero oscurecimiento para mejor contraste con el texto
    const darken = (color, amount = 0.85) => ({
        r: Math.round(color.r * amount),
        g: Math.round(color.g * amount),
        b: Math.round(color.b * amount)
    });
    
    const topDark = darken(top, 0.90);
    const middleDark = darken(middle, 0.85);
    const bottomDark = darken(bottom, 0.80);
    
    return `linear-gradient(to bottom,
        rgb(${topDark.r}, ${topDark.g}, ${topDark.b}) 0%,
        rgb(${middleDark.r}, ${middleDark.g}, ${middleDark.b}) 50%,
        rgb(${bottomDark.r}, ${bottomDark.g}, ${bottomDark.b}) 100%
    )`;
}

// Actualizar el fondo con transición suave usando las capas
function updateBackground(gradient) {
    // Configurar el siguiente layer con el nuevo fondo
    nextBgLayer.style.backgroundImage = gradient;
    
    // Hacer visible el siguiente layer
    nextBgLayer.classList.add('visible');
    
    // Ocultar el layer actual
    currentBgLayer.classList.remove('visible');
    
    // Intercambiar las referencias para la próxima transición
    setTimeout(() => {
        [currentBgLayer, nextBgLayer] = [nextBgLayer, currentBgLayer];
    }, 1000); // Sincronizar con la duración de la transición CSS
}

// Actualizar posiciones de los slides y colores de fondo
function updateSlidePositions() {
    slides.forEach((slide, index) => {
        slide.classList.remove('prev', 'active', 'next');
        
        if (index === currentIndex) {
            slide.classList.add('active');
            
            const activeImg = slide.querySelector('img');
            const imgSrc = activeImg.src;
            
            // Verificar si ya tenemos el gradiente en cache
            if (backgroundCache[imgSrc]) {
                updateBackground(backgroundCache[imgSrc]);
            } else {
                // Detectar colores de la imagen activa por zonas
                getZonalImageColors(activeImg, (zoneColors) => {
                    const gradient = createZonalGradient(zoneColors);
                    backgroundCache[imgSrc] = gradient; // Guardar en cache
                    updateBackground(gradient);
                });
            }
            
        } else if (index === (currentIndex - 1 + slides.length) % slides.length) {
            slide.classList.add('prev');
        } else if (index === (currentIndex + 1) % slides.length) {
            slide.classList.add('next');
        }
    });

    // Actualizar dots
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentIndex);
    });
}

// Siguiente slide
function nextSlide() {
    currentIndex = (currentIndex + 1) % slides.length;
    updateSlidePositions();
}

// Slide anterior
function prevSlide() {
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    updateSlidePositions();
}

// Event listeners para botones
nextButton.addEventListener('click', () => {
    nextSlide();
    resetAutoplay();
});

prevButton.addEventListener('click', () => {
    prevSlide();
    resetAutoplay();
});

// Event listeners para los dots
dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        currentIndex = index;
        updateSlidePositions();
        resetAutoplay();
    });
});

// ===== EXPANDIR IMAGEN AL HACER CLIC =====
slides.forEach(slide => {
    const img = slide.querySelector('img');
    
    img.addEventListener('click', function() {
        // Solo expandir si es la imagen activa
        if (slide.classList.contains('active')) {
            imageModal.classList.add('show');
            expandedImg.src = this.src;
            // Pausar autoplay cuando se expande
            clearInterval(autoplayInterval);
        }
    });
});

// Cerrar modal de imagen expandida
modalClose.addEventListener('click', function() {
    imageModal.classList.remove('show');
    // Reanudar autoplay
    startAutoplay();
});

imageModal.addEventListener('click', function(e) {
    if (e.target === imageModal) {
        imageModal.classList.remove('show');
        startAutoplay();
    }
});

// Cerrar con tecla ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && imageModal.classList.contains('show')) {
        imageModal.classList.remove('show');
        startAutoplay();
    }
});

// Autoplay (cambio automático cada 5 segundos)
function startAutoplay() {
    autoplayInterval = setInterval(nextSlide, 5000);
}

function resetAutoplay() {
    clearInterval(autoplayInterval);
    startAutoplay();
}

// Pausar con hover
track.addEventListener('mouseenter', () => {
    clearInterval(autoplayInterval);
});

track.addEventListener('mouseleave', () => {
    // Solo reanudar si el modal no está abierto
    if (!imageModal.classList.contains('show')) {
        startAutoplay();
    }
});

// Pre-cargar fondos de todas las imágenes al iniciar
function preloadBackgrounds() {
    slides.forEach(slide => {
        const img = slide.querySelector('img');
        getZonalImageColors(img, (zoneColors) => {
            const gradient = createZonalGradient(zoneColors);
            backgroundCache[img.src] = gradient;
        });
    });
}

// Inicializar
updateSlidePositions();
startAutoplay();
preloadBackgrounds(); // Pre-cargar todos los fondos para transiciones más rápidas
