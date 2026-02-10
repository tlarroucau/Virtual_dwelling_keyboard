# Teclado Virtual Accesible (Virtual Dwelling Keyboard)

Un teclado virtual basado en web, diseñado para pacientes con movilidad reducida. Permite escribir mediante **dwell** (reposo del cursor) sin necesidad de hacer clic.

## Características

- **Escritura por Dwell**: Mantén el cursor sobre una tecla durante un tiempo configurable para escribir — no necesitas hacer clic
- **Teclado español**: Distribución QWERTY española completa con ñ, vocales acentuadas (á, é, í, ó, ú, ü), ¡ y ¿
- **Predicción de palabras**: Sugerencias de palabras en español que se actualizan en tiempo real
- **Personalizable**: Ajusta el tiempo de dwell (300ms–3000ms), tamaño de teclas, tema visual y más
- **3 temas**: Oscuro, Claro, Alto contraste
- **Sonido de feedback**: Confirmación auditiva configurable al escribir
- **Sin instalación**: Funciona directamente en el navegador, sin necesidad de servidor

## Cómo usar

### Opción 1: Abrir directamente
Simplemente abre el archivo `index.html` en tu navegador (Chrome, Firefox, Edge):

```bash
# En Linux
xdg-open index.html

# En macOS
open index.html

# En Windows
start index.html
```

### Opción 2: Servidor local (recomendado)
Para mejor rendimiento, usa un servidor local simple:

```bash
# Con Python 3
cd /ruta/a/Virtual_dwelling_keyboard
python3 -m http.server 8080

# Luego abre en el navegador:
# http://localhost:8080
```

### Opción 3: Extensión Live Server (VS Code)
Si tienes VS Code con la extensión **Live Server**:
1. Clic derecho en `index.html`
2. Selecciona "Open with Live Server"

## Cómo funciona el Dwell

1. Mueve el cursor sobre una tecla del teclado virtual
2. Aparece un indicador circular de progreso
3. La tecla se ilumina mientras el cursor permanece sobre ella
4. Cuando el tiempo de dwell se completa, la letra se escribe automáticamente
5. También puedes hacer **clic** en cualquier tecla como método alternativo

## Configuración

Haz clic en **⚙️ Ajustes** para personalizar:

| Opción | Descripción | Rango |
|--------|-------------|-------|
| Tiempo de reposo | Duración para activar una tecla | 300–3000 ms |
| Pausa después de activación | Cooldown para evitar repeticiones | 100–1500 ms |
| Tamaño de teclas | Pequeño / Mediano / Grande | — |
| Tema | Oscuro / Claro / Alto contraste | — |
| Sonido | Activar/desactivar feedback auditivo | — |
| Predicción | Activar/desactivar sugerencias | — |

La configuración se guarda automáticamente en el navegador.

## Predicción de palabras

- Muestra hasta 5 sugerencias mientras escribes
- Basada en frecuencia de palabras comunes en español (~1500 palabras)
- También soporta selección por dwell (mantén el cursor sobre la sugerencia)
- Al seleccionar una predicción, completa la palabra y añade un espacio

## Estructura del proyecto

```
├── index.html          # Página principal
├── css/
│   └── styles.css      # Estilos y temas
├── js/
│   ├── app.js          # Controlador principal
│   ├── keyboard.js     # Layout y renderizado del teclado
│   ├── dwell.js        # Motor de dwell (timers, progreso)
│   └── predictor.js    # Predictor de palabras en español
├── AGENTS.md           # Instrucciones para Copilot/AI
└── README.md           # Este archivo
```

## Tecnologías

- **HTML5 + CSS3 + JavaScript** puro (vanilla)
- Sin frameworks ni dependencias externas
- Sin build tools necesarios
- Compatible con Chrome, Firefox, Edge, Safari

## Requisitos

- Un navegador web moderno
- Dispositivo de entrada que permita mover un cursor (ratón, trackball, joystick adaptado, eye tracker, etc.)

## Futuras mejoras

- [ ] Síntesis de voz (text-to-speech)
- [ ] Banco de frases frecuentes
- [ ] Modo de escaneo por switches
- [ ] Despliegue online
- [ ] Exportar/guardar texto
- [ ] Soporte multi-idioma
