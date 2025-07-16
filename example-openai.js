import { chromium } from 'playwright'
import { z } from 'zod'
import { openai } from '@ai-sdk/openai'
import LLMScraper from './dist/index.js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

async function main() {
  try {
    // Verificar que tenemos la API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no está configurada en el archivo .env')
    }

    console.log('🚀 Iniciando LLM Scraper con OpenAI GPT-4o Mini...')

    // Lanzar una instancia del navegador
    const browser = await chromium.launch({ headless: false }) // headless: false para ver el navegador

    // Inicializar el proveedor de LLM (OpenAI GPT-4o Mini)
    const llm = openai.chat('gpt-4o-mini')

    // Crear una nueva instancia de LLMScraper
    const scraper = new LLMScraper(llm)

    // Abrir una nueva página
    const page = await browser.newPage()
    
    // Navegar a una página de ejemplo (puedes cambiar esta URL)
    console.log('📄 Navegando a Hacker News...')
    await page.goto('https://news.ycombinator.com')

    // Definir el esquema para extraer contenido
    const schema = z.object({
      top: z
        .array(
          z.object({
            title: z.string().describe('Título de la noticia'),
            points: z.number().describe('Puntos de la noticia'),
            by: z.string().describe('Autor de la noticia'),
            commentsURL: z.string().describe('URL de los comentarios'),
          })
        )
        .length(5)
        .describe('Top 5 historias de Hacker News'),
    })

    console.log('🤖 Ejecutando el scraper con GPT-4o Mini...')

    // Ejecutar el scraper
    const { data } = await scraper.run(page, schema, {
      format: 'html',
    })

    // Mostrar los resultados
    console.log('\n📊 Resultados extraídos:')
    console.log(JSON.stringify(data.top, null, 2))

    // Cerrar el navegador
    await page.close()
    await browser.close()

    console.log('✅ ¡Scraping completado exitosamente!')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main() 