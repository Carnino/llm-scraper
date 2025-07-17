# Funcionamiento del Scraper con IA

## 1. Flujo general del Scraper

El proceso de scraping con IA sigue estos pasos principales:

1. **Carga la página web** usando Playwright.
2. **Preprocesa el contenido** de la página (limpia, convierte a HTML, texto, markdown, etc.).
3. **Envía el contenido preprocesado y un esquema de datos** a un modelo de lenguaje (LLM, como GPT-4o).
4. **El LLM extrae los datos estructurados** según el esquema y los devuelve en formato JSON.

---

## 2. Componentes clave y cómo interactúan

### a) `LLMScraper` (`src/index.ts`)

- Es la clase principal que usas en tus scripts.
- Recibe un cliente LLM (por ejemplo, OpenAI GPT-4o).
- Sus métodos principales son:
  - `run(page, schema, options)`: Extrae datos estructurados.
  - `stream(page, schema, options)`: Extrae datos en modo streaming.
  - `generate(page, schema, options)`: Genera código de scraping.

**¿Qué hace internamente?**
- Llama a la función `preprocess` para limpiar y preparar el contenido de la página.
- Llama a `generateAISDKCompletions` (en `models.ts`) para interactuar con el LLM y extraer los datos.

---

### b) `preprocess` (`src/preprocess.ts`)

- Recibe la página de Playwright y las opciones de formato.
- Puede devolver:
  - HTML limpio (elimina scripts, estilos, imágenes, etc. usando `cleanup.ts`)
  - Texto extraído (usando Readability.js)
  - Markdown
  - Imagen (screenshot)
  - HTML sin procesar

El resultado es un objeto `{ url, content, format }` que representa la página lista para el LLM.

---

### c) `generateAISDKCompletions` (`src/models.ts`)

- Recibe el modelo LLM, el contenido preprocesado y el esquema Zod.
- Usa la función `generateObject` de la librería `ai` para:
  - Enviar un mensaje al LLM con el prompt y el contenido de la página.
  - Pedirle al LLM que devuelva un objeto estructurado según el esquema.
- El LLM responde con los datos extraídos en formato JSON.

**¿Cómo se le pide al LLM que extraiga datos?**
- Se le da un prompt tipo:  
  `"You are a sophisticated web scraper. Extract the contents of the webpage"`
- Se le pasa el contenido de la página y el esquema de datos (Zod/JSON Schema).
- El LLM analiza el contenido y responde con los datos estructurados.

---

### d) `cleanup` (`src/cleanup.ts`)

- Es una función que elimina del DOM todos los elementos y atributos irrelevantes (scripts, estilos, imágenes, etc.) para que el LLM reciba solo el contenido útil.

---

## 3. ¿Cómo se conecta todo?

1. Tu script crea una instancia de `LLMScraper` con el modelo LLM.
2. Llama a `scraper.run(page, schema, options)`.
3. El contenido de la página se limpia y se transforma según el formato elegido.
4. El contenido limpio y el esquema se envían al LLM.
5. El LLM responde con los datos extraídos, que tu script puede guardar o procesar.

---

## 4. ¿Por qué es potente este enfoque?

- **No depende de selectores CSS:** El LLM entiende el contenido y puede adaptarse a cambios en la estructura de la página.
- **Flexible:** Puedes cambiar el esquema para extraer diferentes datos sin modificar el código de scraping.
- **Multi-formato:** Puedes scrapear HTML, texto, markdown o incluso imágenes (con modelos multimodales).