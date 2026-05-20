# Teclado Virtual Accesible (Virtual Dwelling Keyboard)

Un teclado virtual basado en web, diseñado para pacientes con movilidad reducida. Permite escribir mediante **dwell** (reposo del cursor) sin necesidad de hacer clic.

🌐 **Probar online**: [https://tlarroucau.github.io/Virtual_dwelling_keyboard/](https://tlarroucau.github.io/Virtual_dwelling_keyboard/)

## Características

- **Escritura por Dwell**: Mantén el cursor sobre una tecla durante un tiempo configurable para escribir — no necesitas hacer clic
- **Teclado español**: Distribución QWERTY española completa con ñ, vocales acentuadas (á, é, í, ó, ú, ü), ¡ y ¿
- **Predicción de palabras**: Sugerencias de palabras en español que se actualizan en tiempo real (~1500 palabras frecuentes)
- **Botones de necesidades rápidas**: Emojis para comunicar necesidades básicas (dolor, sed, frío, baño, etc.) con un solo dwell
- **Frases componibles de dolor**: Botones "Me duele" / "Me incomoda" + partes del cuerpo (cabeza, ojos, espalda, etc.) para formar frases rápidamente
- **Juegos accesibles**: Sudoku y Solitario con controles por dwell; las partidas nuevas de Solitario se generan con solución
- **Síntesis de voz con ElevenLabs**: Lee en voz alta el texto escrito usando la API de ElevenLabs (requiere API Key y Voice ID)
- **Teclado fluido**: Las teclas se adaptan automáticamente al ancho de la ventana — nunca se salen de la pantalla
- **Personalizable**: Ajusta el tiempo de dwell (300–3000ms), cooldown (100–5000ms), tamaño de teclas, tamaño de emojis, amplificación de fuente, tema visual y más
- **3 temas**: Oscuro, Claro, Alto contraste
- **Sonido de feedback**: Confirmación auditiva configurable al escribir
- **Sin instalación**: Funciona directamente en el navegador, sin necesidad de servidor

## Cómo usar

### Opción 1: Online (GitHub Pages)
Simplemente visita [https://tlarroucau.github.io/Virtual_dwelling_keyboard/](https://tlarroucau.github.io/Virtual_dwelling_keyboard/)

### Opción 2: Abrir directamente
Abre el archivo `index.html` en tu navegador (Chrome, Firefox, Edge):

```bash
# En Linux
xdg-open index.html

# En macOS
open index.html

# En Windows
start index.html
```

### Opción 3: Servidor local
Para mejor rendimiento, usa un servidor local simple:

```bash
# Con Python 3
cd /ruta/a/Virtual_dwelling_keyboard
python3 -m http.server 8080
# Luego abre: http://localhost:8080
```

## Cómo funciona el Dwell

1. Mueve el cursor sobre una tecla del teclado virtual
2. Aparece una barra de progreso que se llena gradualmente
3. Cuando el tiempo de dwell se completa, la letra se escribe automáticamente
4. Un breve cooldown evita repeticiones accidentales
5. También puedes hacer **clic** en cualquier tecla como método alternativo
6. Los botones de acción (Hablar, Borrar palabra, Borrar todo) también soportan dwell

## Síntesis de voz (ElevenLabs)

El botón **🔊 Hablar** lee en voz alta el texto escrito usando la API de [ElevenLabs](https://elevenlabs.io/).

### Configuración
1. Crea una cuenta en [ElevenLabs](https://elevenlabs.io/) y obtén tu **API Key** desde el panel de usuario
2. Copia el **Voice ID** de la voz que quieras usar (disponible en la sección Voices de ElevenLabs)
3. En la app, abre **⚙️ Ajustes** y pega ambos valores en los campos correspondientes
4. Ajusta la velocidad de habla con el control deslizante

> **🔒 Seguridad**: La API Key se guarda únicamente en el `localStorage` de tu navegador. Nunca se incluye en el código fuente ni se transmite a ningún servidor salvo el de ElevenLabs.

## Configuración

Haz clic en **⚙️ Ajustes** para personalizar:

| Opción | Descripción | Rango |
|--------|-------------|-------|
| Tiempo de reposo | Duración para activar una tecla por dwell | 300–3000 ms |
| Pausa después de activación | Cooldown para evitar repeticiones | 100–5000 ms |
| Tamaño de teclas | Pequeño / Mediano / Grande / Extra Grande | — |
| Amplificación de fuente | Normal / Grande / Extra Grande | — |
| Tamaño de emojis | Pequeño / Mediano / Grande / Extra Grande | — |
| Tema | Oscuro / Claro / Alto contraste | — |
| Sonido | Activar/desactivar feedback auditivo | — |
| Predicción | Activar/desactivar sugerencias de palabras | — |
| API Key ElevenLabs | Clave para síntesis de voz | — |
| Voice ID ElevenLabs | Identificador de la voz a usar | — |
| Velocidad de habla | Velocidad de la voz sintetizada | 0.5–2.0 |

La configuración se guarda automáticamente en el navegador.

## Predicción de palabras

- Muestra hasta 5 sugerencias mientras escribes
- Basada en frecuencia de palabras comunes en español (~1500 palabras)
- También soporta selección por dwell (mantén el cursor sobre la sugerencia)
- Al seleccionar una predicción, completa la palabra y añade un espacio

## Compatibilidad con Eye Trackers

Este teclado está diseñado para funcionar con dispositivos de seguimiento ocular (eye trackers) como **Tobii**. El eye tracker mueve el cursor con la mirada, y el sistema de dwell del teclado se encarga de "hacer clic" automáticamente.

- **Windows**: Instala [Tobii Experience](https://gaming.tobii.com/getstarted/) y activa la emulación de ratón
- **Linux**: Usa [Talon](https://talonvoice.com/) con soporte para Tobii

## Estructura del proyecto

```
├── index.html          # Página principal
├── games.html          # Juegos accesibles
├── css/
│   └── styles.css      # Estilos, animaciones y temas
├── js/
│   ├── app.js          # Controlador principal, TTS, gestión de estado
│   ├── keyboard.js     # Layout y renderizado del teclado español
│   ├── dwell.js        # Motor de dwell (timers, progreso, cooldown)
│   ├── games.js        # Sudoku, Solitario y navegación de juegos
│   └── predictor.js    # Predictor de palabras en español (Trie)
├── AGENTS.md           # Instrucciones para Copilot/AI
└── README.md           # Este archivo
```

## Tecnologías

- **HTML5 + CSS3 + JavaScript** puro (vanilla) — cero dependencias
- **ElevenLabs API** para síntesis de voz (opcional, requiere API Key)
- **CSS Custom Properties** para temas y tamaños configurables
- **Trie** para predicción de palabras eficiente
- Compatible con Chrome, Firefox, Edge, Safari

## Requisitos

- Un navegador web moderno
- Dispositivo de entrada que permita mover un cursor (ratón, trackball, joystick adaptado, eye tracker, etc.)
- (Opcional) Cuenta de [ElevenLabs](https://elevenlabs.io/) para la función de voz

## Futuras mejoras

- [ ] Banco de frases personalizadas
- [ ] Modo de escaneo por switches
- [ ] Exportar/guardar texto
- [ ] Soporte multi-idioma
