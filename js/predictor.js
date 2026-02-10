/**
 * predictor.js — Spanish word prediction engine
 * Uses a frequency-weighted trie for fast prefix lookups.
 * Includes a built-in corpus of ~1500 common Spanish words.
 */

const Predictor = (() => {
    'use strict';

    // --- Trie data structure ---
    class TrieNode {
        constructor() {
            this.children = {};
            this.isEnd = false;
            this.word = null;
            this.freq = 0;
        }
    }

    let root = new TrieNode();
    let enabled = true;

    /**
     * Insert a word into the trie.
     */
    function insert(word, freq) {
        let node = root;
        const lower = word.toLowerCase();
        for (const ch of lower) {
            if (!node.children[ch]) {
                node.children[ch] = new TrieNode();
            }
            node = node.children[ch];
        }
        node.isEnd = true;
        node.word = lower;
        node.freq = freq;
    }

    /**
     * Find all words with a given prefix, returns sorted by frequency.
     * @param {string} prefix
     * @param {number} [limit=5]
     * @returns {string[]}
     */
    function predict(prefix, limit = 5) {
        if (!enabled || !prefix || prefix.length === 0) return [];

        const lower = prefix.toLowerCase();
        let node = root;

        // Navigate to the prefix node
        for (const ch of lower) {
            if (!node.children[ch]) return [];
            node = node.children[ch];
        }

        // Collect all words under this node
        const results = [];
        collectWords(node, results);

        // Sort by frequency (descending) and return top N
        results.sort((a, b) => b.freq - a.freq);
        return results.slice(0, limit).map((r) => r.word);
    }

    function collectWords(node, results) {
        if (node.isEnd) {
            results.push({ word: node.word, freq: node.freq });
        }
        for (const ch in node.children) {
            collectWords(node.children[ch], results);
        }
    }

    function setEnabled(val) {
        enabled = val;
    }

    function isEnabled() {
        return enabled;
    }

    /**
     * Initialize with the built-in Spanish word list.
     */
    function init() {
        root = new TrieNode();
        SPANISH_WORDS.forEach(([word, freq]) => insert(word, freq));
    }

    // ===================================================================
    // Built-in Spanish word corpus (word, relative frequency 1-10000)
    // Top ~1500 most common Spanish words
    // ===================================================================
    const SPANISH_WORDS = [
        // Articles & determinants
        ["el", 10000], ["la", 9900], ["los", 9500], ["las", 9400], ["un", 9300],
        ["una", 9200], ["unos", 6000], ["unas", 5900], ["lo", 9100], ["al", 9000],
        ["del", 8900],

        // Pronouns
        ["yo", 8800], ["tú", 8700], ["él", 8600], ["ella", 8500], ["nosotros", 7000],
        ["nosotras", 5500], ["vosotros", 5000], ["ellos", 8000], ["ellas", 7500],
        ["usted", 7800], ["ustedes", 7200], ["me", 8900], ["te", 8800], ["se", 9000],
        ["nos", 8200], ["le", 8700], ["les", 8300], ["mi", 8500], ["tu", 8600],
        ["su", 8800], ["mis", 7500], ["tus", 7400], ["sus", 7800], ["nuestro", 6800],
        ["nuestra", 6700], ["nuestros", 6200], ["nuestras", 6100], ["este", 8200],
        ["esta", 8100], ["estos", 7500], ["estas", 7400], ["ese", 7800], ["esa", 7700],
        ["esos", 7200], ["esas", 7100], ["aquel", 6500], ["aquella", 6400],
        ["algo", 7800], ["alguien", 7200], ["alguno", 6000], ["alguna", 6100],
        ["algunos", 6500], ["algunas", 6400], ["nada", 7800], ["nadie", 7200],
        ["ninguno", 5800], ["ninguna", 5700], ["todo", 8500], ["toda", 8400],
        ["todos", 8300], ["todas", 8200], ["otro", 7800], ["otra", 7700],
        ["otros", 7600], ["otras", 7500], ["mismo", 7500], ["misma", 7400],
        ["que", 9500], ["quien", 7500], ["cual", 7200], ["donde", 7800],
        ["cuando", 7700], ["como", 8500], ["cuanto", 6000], ["qué", 8500],
        ["quién", 7200], ["cuál", 7000], ["dónde", 7500], ["cuándo", 7200],
        ["cómo", 8000], ["cuánto", 5800],

        // Prepositions & conjunctions
        ["de", 9800], ["en", 9700], ["a", 9600], ["por", 9200], ["para", 9100],
        ["con", 9000], ["sin", 8200], ["sobre", 7800], ["entre", 7600],
        ["hasta", 7800], ["desde", 7500], ["hacia", 6800], ["durante", 7000],
        ["según", 6200], ["contra", 6500], ["tras", 6000], ["bajo", 6500],
        ["ante", 5800], ["y", 9800], ["o", 9200], ["pero", 8800], ["ni", 7200],
        ["que", 9500], ["si", 8500], ["porque", 8200], ["aunque", 7500],
        ["como", 8500], ["cuando", 7700], ["mientras", 7000], ["sino", 7200],
        ["pues", 7000], ["ya", 8000], ["también", 8200], ["tampoco", 6500],
        ["además", 7200], ["sin embargo", 7000],

        // Common verbs (infinitive and major conjugations)
        ["ser", 9800], ["soy", 9200], ["eres", 8800], ["es", 9700], ["somos", 8000],
        ["son", 9000], ["era", 8500], ["fue", 8800], ["sido", 8000], ["siendo", 7000],
        ["estar", 9500], ["estoy", 8800], ["estás", 8500], ["está", 9200],
        ["estamos", 7800], ["están", 8500], ["estaba", 8000], ["estuvo", 7200],
        ["estado", 7800],
        ["haber", 9200], ["he", 9000], ["has", 8800], ["ha", 9200], ["hemos", 8000],
        ["han", 8800], ["había", 8500], ["hubo", 7000],
        ["tener", 9200], ["tengo", 8800], ["tienes", 8500], ["tiene", 9000],
        ["tenemos", 7800], ["tienen", 8500], ["tenía", 8000], ["tuvo", 7500],
        ["tenido", 7200],
        ["hacer", 9100], ["hago", 8200], ["haces", 7800], ["hace", 9000],
        ["hacemos", 7500], ["hacen", 8200], ["hacía", 7800], ["hizo", 8000],
        ["hecho", 8200],
        ["poder", 9000], ["puedo", 8800], ["puedes", 8500], ["puede", 9000],
        ["podemos", 7800], ["pueden", 8500], ["podía", 7800], ["pudo", 7500],
        ["podido", 6500],
        ["decir", 8800], ["digo", 8000], ["dices", 7500], ["dice", 8800],
        ["decimos", 7200], ["dicen", 8200], ["decía", 7500], ["dijo", 8200],
        ["dicho", 7800],
        ["ir", 9200], ["voy", 8800], ["vas", 8500], ["va", 9000], ["vamos", 8500],
        ["van", 8500], ["iba", 7800], ["fue", 8800], ["ido", 7000],
        ["ver", 8800], ["veo", 8200], ["ves", 7800], ["ve", 8000], ["vemos", 7500],
        ["ven", 7800], ["veía", 7000], ["vio", 7800], ["visto", 7500],
        ["dar", 8500], ["doy", 7800], ["das", 7200], ["da", 8200], ["damos", 7000],
        ["dan", 7800], ["daba", 7000], ["dio", 7500], ["dado", 7200],
        ["saber", 8500], ["sé", 8500], ["sabes", 8000], ["sabe", 8500],
        ["sabemos", 7200], ["saben", 7800], ["sabía", 7500], ["supo", 7000],
        ["sabido", 6500],
        ["querer", 8500], ["quiero", 8500], ["quieres", 8200], ["quiere", 8500],
        ["queremos", 7500], ["quieren", 8000], ["quería", 7800], ["quiso", 7200],
        ["querido", 7500],
        ["llegar", 7800], ["llego", 7200], ["llegas", 6800], ["llega", 7800],
        ["llegamos", 6800], ["llegan", 7200], ["llegó", 7500],
        ["pasar", 7500], ["paso", 7200], ["pasa", 7800], ["pasamos", 6500],
        ["pasan", 7000], ["pasó", 7500], ["pasado", 7500],
        ["deber", 7500], ["debo", 7200], ["debes", 7000], ["debe", 7800],
        ["debemos", 7000], ["deben", 7500],
        ["poner", 7500], ["pongo", 7000], ["pone", 7500], ["ponen", 7200],
        ["ponemos", 6500], ["puso", 7000], ["puesto", 7200],
        ["parecer", 7200], ["parece", 8000], ["parecen", 7000], ["pareció", 6800],
        ["quedar", 7200], ["quedo", 6500], ["queda", 7500], ["quedan", 7000],
        ["quedó", 7000],
        ["creer", 7500], ["creo", 8000], ["crees", 7200], ["cree", 7800],
        ["creemos", 6800], ["creen", 7200],
        ["hablar", 7500], ["hablo", 7000], ["hablas", 6800], ["habla", 7800],
        ["hablamos", 6500], ["hablan", 7200],
        ["llevar", 7500], ["llevo", 7200], ["lleva", 7800], ["llevan", 7200],
        ["llevó", 7000],
        ["dejar", 7200], ["dejo", 6800], ["deja", 7500], ["dejan", 7000],
        ["dejó", 7200],
        ["seguir", 7200], ["sigo", 6800], ["sigue", 7500], ["siguen", 7000],
        ["siguió", 6800],
        ["encontrar", 7000], ["encuentro", 7000], ["encuentra", 7200],
        ["encontró", 7000],
        ["llamar", 7000], ["llamo", 6800], ["llama", 7200], ["llaman", 6800],
        ["llamó", 6800],
        ["venir", 7200], ["vengo", 7000], ["viene", 7500], ["vienen", 7000],
        ["vino", 7000],
        ["pensar", 7200], ["pienso", 7000], ["piensa", 7200], ["piensan", 6800],
        ["pensó", 6800],
        ["salir", 7200], ["salgo", 6800], ["sale", 7200], ["salen", 6800],
        ["salió", 7000],
        ["volver", 7000], ["vuelvo", 6800], ["vuelve", 7200], ["vuelven", 6800],
        ["volvió", 7000],
        ["tomar", 7000], ["tomo", 6500], ["toma", 7200], ["toman", 6800],
        ["tomó", 6800],
        ["conocer", 7200], ["conozco", 7000], ["conoce", 7200], ["conocen", 6800],
        ["conocí", 6500],
        ["vivir", 7200], ["vivo", 7200], ["vive", 7200], ["viven", 6800],
        ["vivió", 6800],
        ["sentir", 7000], ["siento", 7200], ["siente", 7000], ["sienten", 6500],
        ["sintió", 6500],
        ["tratar", 6800], ["trato", 6500], ["trata", 7200], ["tratan", 6500],
        ["crear", 6800], ["creo", 8000], ["crea", 6800], ["creó", 6500],
        ["contar", 6800], ["cuento", 6800], ["cuenta", 7500], ["cuentan", 6500],
        ["empezar", 6800], ["empiezo", 6500], ["empieza", 7000], ["empezó", 6800],
        ["trabajar", 7200], ["trabajo", 7800], ["trabaja", 7200], ["trabajan", 6800],
        ["escribir", 6800], ["escribo", 6500], ["escribe", 6800], ["escribió", 6500],
        ["leer", 6800], ["leo", 6200], ["lee", 6800], ["leen", 6500],
        ["entender", 6800], ["entiendo", 6800], ["entiende", 6800],
        ["pedir", 6800], ["pido", 6500], ["pide", 6800], ["piden", 6500],
        ["recibir", 6500], ["recibo", 6200], ["recibe", 6500],
        ["recordar", 6800], ["recuerdo", 7000], ["recuerda", 6800],
        ["terminar", 6500], ["termina", 6500], ["terminó", 6500],
        ["permitir", 6200], ["permite", 6500], ["permiten", 6000],
        ["aparecer", 6200], ["aparece", 6500], ["aparecen", 6000],
        ["conseguir", 6500], ["consigue", 6500], ["consiguió", 6200],
        ["comenzar", 6500], ["comienza", 6800], ["comenzó", 6500],
        ["servir", 6200], ["sirve", 6500], ["sirven", 6000],
        ["sacar", 6200], ["saca", 6200], ["sacó", 6000],
        ["necesitar", 7000], ["necesito", 7200], ["necesita", 7200],
        ["necesitan", 6800],
        ["mantener", 6500], ["mantiene", 6500],
        ["resultar", 6200], ["resulta", 6500],
        ["leer", 6800], ["jugar", 6500], ["perder", 6500], ["producir", 6200],
        ["ocurrir", 6200], ["existir", 6500], ["realizar", 6200],
        ["ayudar", 6800], ["ayuda", 7200], ["ayudan", 6200],
        ["cambiar", 6500], ["cambio", 6500], ["cambia", 6200],
        ["presentar", 6000], ["esperar", 6800], ["espero", 7000], ["espera", 7000],
        ["buscar", 6800], ["busco", 6500], ["busca", 6800],
        ["usar", 6800], ["uso", 6500], ["usa", 6500],
        ["gustar", 7500], ["gusta", 8000], ["gustan", 7200], ["gustó", 6800],
        ["tocar", 6200], ["abrir", 6500], ["morir", 6200], ["cumplir", 6000],
        ["dormir", 6200], ["correr", 6200], ["comer", 6500], ["beber", 6000],
        ["andar", 6000], ["caer", 6000], ["nacer", 6000], ["crecer", 6000],

        // Common nouns
        ["tiempo", 8500], ["año", 8500], ["años", 8500], ["día", 8800],
        ["días", 8200], ["vez", 8500], ["veces", 8000], ["parte", 8000],
        ["mundo", 8200], ["vida", 8500], ["hombre", 7800], ["mujer", 7800],
        ["hombres", 7200], ["mujeres", 7200], ["casa", 8000], ["país", 7800],
        ["lugar", 7500], ["trabajo", 7800], ["momento", 7800], ["cosa", 8000],
        ["cosas", 7800], ["forma", 7500], ["gobierno", 7200], ["persona", 7500],
        ["personas", 7500], ["niño", 7500], ["niña", 7200], ["niños", 7200],
        ["niñas", 7000], ["hijo", 7500], ["hija", 7200], ["hijos", 7200],
        ["padre", 7500], ["madre", 7500], ["familia", 7800], ["nombre", 7500],
        ["pueblo", 7000], ["mano", 7200], ["manos", 6800], ["ojo", 6800],
        ["ojos", 7000], ["cabeza", 6800], ["agua", 7500], ["punto", 7200],
        ["estado", 7200], ["ciudad", 7500], ["tipo", 7200], ["grupo", 7000],
        ["problema", 7500], ["palabra", 7200], ["palabras", 7000],
        ["cuenta", 7500], ["número", 7000], ["ejemplo", 7200], ["historia", 7200],
        ["caso", 7500], ["sentido", 7000], ["fin", 7200], ["modo", 7000],
        ["idea", 7200], ["cuerpo", 6800], ["libro", 7000], ["muerte", 6800],
        ["verdad", 7500], ["razón", 7200], ["fuerza", 6800], ["cambio", 6500],
        ["poder", 9000], ["derecho", 7000], ["guerra", 6800], ["tierra", 7000],
        ["noche", 7500], ["mañana", 7500], ["tarde", 7200], ["hora", 7500],
        ["horas", 7200], ["semana", 7200], ["mes", 7000], ["meses", 6800],
        ["camino", 6800], ["puerta", 6800], ["paso", 7200], ["clase", 7000],
        ["calle", 6800], ["cara", 7000], ["relación", 6800], ["medio", 7200],
        ["centro", 7000], ["mesa", 6800], ["cama", 6500], ["comida", 7000],
        ["dinero", 7200], ["salud", 7200], ["dolor", 7000], ["amor", 7500],
        ["corazón", 7000], ["luz", 7000], ["sol", 6800], ["fuego", 6500],
        ["aire", 6800], ["mar", 6800], ["campo", 6800], ["juego", 6800],
        ["música", 7000], ["teléfono", 7000], ["presidente", 6800],
        ["programa", 6800], ["sistema", 7200], ["empresa", 7000],
        ["información", 7500], ["proyecto", 7000], ["servicio", 6800],
        ["situación", 7000], ["desarrollo", 6800], ["resultado", 6800],
        ["cuestión", 6500], ["medida", 6500], ["educación", 6800],
        ["sociedad", 6500], ["cultura", 6500], ["política", 6800],
        ["acción", 6500], ["actividad", 6500], ["experiencia", 6800],
        ["oportunidad", 6500], ["posibilidad", 6200], ["condición", 6200],
        ["seguridad", 6500], ["efecto", 6200], ["proceso", 6500],
        ["nivel", 6800], ["valor", 6500], ["interés", 6500], ["orden", 6500],
        ["papel", 6500], ["espacio", 6500], ["ley", 6500], ["acuerdo", 6500],
        ["estudio", 6800], ["imagen", 6500], ["opinión", 6500],

        // Common adjectives
        ["bueno", 8000], ["buena", 8000], ["buenos", 7500], ["buenas", 7500],
        ["malo", 7200], ["mala", 7200], ["malos", 6800], ["malas", 6800],
        ["grande", 8000], ["grandes", 7500], ["pequeño", 7200], ["pequeña", 7200],
        ["nuevo", 8000], ["nueva", 8000], ["nuevos", 7500], ["nuevas", 7500],
        ["viejo", 7000], ["vieja", 7000], ["joven", 7000], ["largo", 6800],
        ["larga", 6800], ["mejor", 8200], ["peor", 7000], ["mayor", 7500],
        ["menor", 7000], ["primero", 7500], ["primera", 7500], ["último", 7200],
        ["última", 7200], ["alto", 7000], ["alta", 7000], ["bajo", 6500],
        ["baja", 6500], ["importante", 7500], ["posible", 7200], ["diferente", 7000],
        ["siguiente", 7000], ["necesario", 6800], ["necesaria", 6800],
        ["cierto", 6800], ["claro", 7200], ["propio", 7000], ["propia", 7000],
        ["solo", 8000], ["sola", 7200], ["único", 7000], ["general", 7000],
        ["público", 6800], ["social", 7000], ["político", 6800], ["económico", 6500],
        ["humano", 6500], ["real", 7000], ["nacional", 6800], ["internacional", 6200],
        ["libre", 6800], ["igual", 7000], ["difícil", 7000], ["fácil", 7000],
        ["fuerte", 6800], ["cerca", 7200], ["lejos", 6800], ["junto", 6800],
        ["feliz", 7200], ["triste", 6500], ["contento", 6500], ["contenta", 6500],
        ["bonito", 6800], ["bonita", 7000], ["hermoso", 6500], ["hermosa", 6500],
        ["lindo", 6500], ["linda", 6500], ["blanco", 6800], ["negro", 6800],
        ["rojo", 6500], ["azul", 6500], ["verde", 6500], ["amarillo", 6000],

        // Adverbs
        ["no", 9800], ["más", 9500], ["muy", 8800], ["bien", 8500],
        ["mal", 7500], ["ya", 8000], ["aquí", 7800], ["ahora", 8200],
        ["después", 7800], ["antes", 7500], ["siempre", 7800], ["nunca", 7500],
        ["hoy", 7800], ["ayer", 7000], ["mucho", 8200], ["poco", 7500],
        ["menos", 7800], ["casi", 7200], ["sólo", 7800], ["aún", 7200],
        ["tan", 8000], ["también", 8200], ["así", 8200], ["entonces", 7800],
        ["luego", 7200], ["todavía", 7200], ["bastante", 6800],
        ["demasiado", 6800], ["realmente", 6800], ["quizás", 6500],
        ["solamente", 6200], ["especialmente", 6200], ["normalmente", 6000],
        ["probablemente", 6200], ["exactamente", 6000], ["simplemente", 6000],
        ["rápido", 6500], ["despacio", 5800], ["tarde", 7200], ["temprano", 6500],
        ["pronto", 6800], ["primero", 7500], ["finalmente", 6500],
        ["generalmente", 6000], ["actualmente", 6000],

        // Common expressions & useful words
        ["sí", 8800], ["no", 9800], ["por favor", 8500], ["gracias", 8500],
        ["hola", 8500], ["adiós", 7500], ["buenos", 7500], ["buenas", 7500],
        ["perdón", 7000], ["disculpa", 6500], ["ayuda", 7200], ["necesito", 7200],
        ["quiero", 8500], ["puedo", 8800], ["tengo", 8800], ["estoy", 8800],
        ["bien", 8500], ["mal", 7500], ["dolor", 7000], ["hambre", 6500],
        ["sed", 6000], ["frío", 6500], ["calor", 6500], ["cansado", 6500],
        ["cansada", 6200], ["enfermo", 6500], ["enferma", 6200],
        ["contento", 6500], ["triste", 6500], ["miedo", 6500],
        ["baño", 6500], ["médico", 6800], ["hospital", 6500],
        ["medicina", 6200], ["comida", 7000], ["agua", 7500],
        ["teléfono", 7000], ["llamar", 7000], ["mensaje", 6800],

        // Numbers as words
        ["uno", 7800], ["dos", 8000], ["tres", 7800], ["cuatro", 7500],
        ["cinco", 7500], ["seis", 7000], ["siete", 7000], ["ocho", 7000],
        ["nueve", 6800], ["diez", 7000], ["once", 6200], ["doce", 6200],
        ["cien", 6500], ["mil", 6500], ["millón", 6000],

        // Days & months
        ["lunes", 6500], ["martes", 6500], ["miércoles", 6200], ["jueves", 6500],
        ["viernes", 6500], ["sábado", 6500], ["domingo", 6500],
        ["enero", 6000], ["febrero", 6000], ["marzo", 6000], ["abril", 6000],
        ["mayo", 6200], ["junio", 6000], ["julio", 6000], ["agosto", 6000],
        ["septiembre", 5800], ["octubre", 5800], ["noviembre", 5800],
        ["diciembre", 5800],

        // Common question patterns
        ["por qué", 8200], ["qué tal", 7800], ["cómo estás", 7500],
        ["cómo está", 7500], ["cuánto", 5800], ["cuántos", 5500],

        // More useful nouns
        ["amigo", 7000], ["amiga", 6800], ["amigos", 6800],
        ["doctor", 6500], ["doctora", 6200], ["enfermera", 6000],
        ["enfermero", 5800], ["profesor", 6200], ["profesora", 6000],
        ["perro", 6500], ["gato", 6200], ["animal", 6000],
        ["comida", 7000], ["desayuno", 6200], ["almuerzo", 6200],
        ["cena", 6500], ["pan", 6200], ["leche", 6200], ["café", 6800],
        ["fruta", 6000], ["carne", 6000], ["pescado", 5800],
        ["escuela", 6800], ["universidad", 6500], ["iglesia", 6000],
        ["tienda", 6200], ["mercado", 6000], ["restaurante", 6200],
        ["banco", 6200], ["parque", 6200], ["hospital", 6500],
        ["carro", 5800], ["coche", 6200], ["autobús", 5800], ["tren", 6000],
        ["avión", 6000], ["bicicleta", 5800],
        ["ropa", 6200], ["zapatos", 5800], ["camisa", 5800],
        ["pantalón", 5500], ["vestido", 5800],
        ["computadora", 6200], ["computador", 6000], ["ordenador", 6000],
        ["internet", 6500], ["correo", 6200], ["página", 6500],
        ["problema", 7500], ["solución", 6500], ["pregunta", 6800],
        ["respuesta", 6800], ["ejemplo", 7200],
        ["gracias", 8500], ["favor", 7800], ["perdón", 7000],

        // Healthcare specific
        ["dolor", 7000], ["cabeza", 6800], ["estómago", 6000],
        ["espalda", 5800], ["pierna", 5800], ["brazo", 5800],
        ["fiebre", 6000], ["tos", 5500], ["gripe", 5500],
        ["pastilla", 5500], ["medicamento", 5800], ["receta", 5500],
        ["cita", 6000], ["consulta", 5800], ["tratamiento", 5800],
        ["cirugía", 5200], ["operación", 5500], ["urgencia", 5500],
        ["emergencia", 5800], ["ambulancia", 5500],
        ["presión", 5500], ["temperatura", 5500], ["sangre", 5800],
        ["corazón", 7000], ["pulmón", 5200], ["pulmones", 5200],
        ["respirar", 5500], ["descansar", 5800], ["dormir", 6200],
        ["despertar", 5800], ["levantar", 5800], ["sentar", 5500],
        ["caminar", 6000], ["mover", 5800], ["tocar", 6200],

        // Additional useful verbs
        ["mirar", 6500], ["miro", 6000], ["mira", 6500],
        ["escuchar", 6500], ["escucha", 6200],
        ["entrar", 6200], ["entra", 6200],
        ["cerrar", 6200], ["cierra", 6000],
        ["abrir", 6500], ["abre", 6200],
        ["comprar", 6500], ["compra", 6200],
        ["vender", 6000], ["vende", 6000],
        ["pagar", 6200], ["paga", 6000],
        ["estudiar", 6500], ["estudia", 6200],
        ["aprender", 6500], ["aprende", 6200],
        ["enseñar", 6000], ["enseña", 5800],
        ["preguntar", 6200], ["pregunta", 6800],
        ["responder", 6200], ["responde", 6000],
        ["intentar", 6200], ["intenta", 6200],
        ["olvidar", 6000], ["olvida", 6000],
        ["decidir", 6000], ["decide", 6000],
        ["elegir", 5800], ["elige", 5800],
        ["preferir", 6000], ["prefiere", 6000], ["prefiero", 6200],
        ["desear", 6000], ["deseo", 6000],
        ["imaginar", 5800], ["imagina", 5800],
        ["preparar", 6000], ["prepara", 5800],
        ["cocinar", 5800], ["cocina", 6000],
        ["limpiar", 5800], ["limpia", 5800],
        ["celebrar", 5800], ["celebra", 5500],
        ["cantar", 5800], ["canta", 5500],
        ["bailar", 5800], ["baila", 5500],
    ];

    return {
        init,
        predict,
        setEnabled,
        isEnabled,
    };
})();
