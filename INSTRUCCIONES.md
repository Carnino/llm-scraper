# Instrucciones para usar LLM Scraper con OpenAI

## 🚀 Configuración Inicial

### 1. Obtener API Key de OpenAI
- Ve a [OpenAI Platform](https://platform.openai.com/api-keys)
- Crea una nueva API key
- Copia la key

### 2. Configurar el archivo .env
Edita el archivo `.env` y reemplaza `tu_api_key_de_openai_aqui` con tu API key real:

```
OPENAI_API_KEY=sk-tu-api-key-real-aqui
```

### 3. Instalar dependencias (ya hecho)
```bash
npm install @ai-sdk/openai playwright zod dotenv
```

### 4. Compilar el proyecto (ya hecho)
```bash
npm run build
```

## 🧪 Probar el proyecto

### Opción 1: Prueba simple
```bash
node test-openai.js
```

### Opción 2: Ejemplo completo
```bash
node example-openai.js
```

## 📝 Cómo funciona

1. **Configuración del LLM**: Usamos OpenAI GPT-4o Mini como modelo de lenguaje
2. **Navegación**: Playwright abre un navegador y navega a la página
3. **Extracción**: El LLM analiza el HTML y extrae datos estructurados
4. **Resultado**: Los datos se devuelven en formato JSON según el esquema definido

## 🤖 Modelos de OpenAI disponibles

### GPT-4o Mini (configurado actualmente)
- **Modelo**: `gpt-4o-mini`
- **Ventajas**: Más rápido y económico
- **Uso**: Ideal para tareas simples de extracción

### GPT-4o (versión completa)
- **Modelo**: `gpt-4o`
- **Ventajas**: Mayor precisión y capacidades
- **Uso**: Para tareas complejas que requieren más precisión

### Para cambiar el modelo
En los archivos de ejemplo, cambia esta línea:
```javascript
// Para GPT-4o Mini (actual)
const llm = openai.chat('gpt-4o-mini')

// Para GPT-4o completo
const llm = openai.chat('gpt-4o')
```

## 🔧 Personalización

### Cambiar la página a scrapear
En el archivo de ejemplo, cambia esta línea:
```javascript
await page.goto('https://example.com')
```

### Cambiar el esquema de datos
Modifica el objeto `schema` para extraer diferentes datos:
```javascript
const schema = z.object({
  // Define aquí los campos que quieres extraer
  titulo: z.string(),
  precio: z.number(),
  // etc...
})
```

### Cambiar el formato de entrada
Opciones disponibles:
- `'html'` - HTML procesado (recomendado)
- `'raw_html'` - HTML sin procesar
- `'markdown'` - Convertido a Markdown
- `'text'` - Solo texto extraído
- `'image'` - Captura de pantalla (solo modelos multimodales)

## 🐛 Solución de problemas

### Error: "OPENAI_API_KEY no está configurada"
- Verifica que el archivo `.env` existe y tiene la API key correcta
- Asegúrate de que la API key comience con `sk-`

### Error: "Cannot find module"
- Ejecuta `npm run build` para compilar el proyecto
- Verifica que todas las dependencias están instaladas

### Error de red
- Verifica tu conexión a internet
- Asegúrate de que tu API key de OpenAI es válida

### Error de modelo
- Verifica que el nombre del modelo sea correcto
- GPT-4o Mini: `gpt-4o-mini`
- GPT-4o: `gpt-4o`

## 📚 Más ejemplos

Revisa la carpeta `examples/` para más ejemplos de uso:
- `hn.ts` - Scraping de Hacker News
- `streaming.ts` - Streaming de resultados
- `codegen.ts` - Generación de código
- `ollama.ts` - Uso con Ollama

## 💡 Consejos

1. **Empieza simple**: Usa páginas simples como `example.com` para probar
2. **Esquemas claros**: Define bien qué datos quieres extraer
3. **Manejo de errores**: Siempre incluye try-catch en tu código
4. **API Key segura**: Nunca compartas tu API key en código público
5. **Modelo adecuado**: GPT-4o Mini es más económico, GPT-4o es más preciso 