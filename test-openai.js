import { chromium } from 'playwright'
import { z } from 'zod'
import { openai } from '@ai-sdk/openai'
import LLMScraper from './dist/index.js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

async function testOpenAI() {
  try {
    // Verificar API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Error: OPENAI_API_KEY no está configurada')
      console.log('📝 Por favor, edita el archivo .env y agrega tu API key de OpenAI')
      return
    }

    console.log('🚀 Iniciando prueba con OpenAI GPT-4o Mini...')

    // Lanzar navegador
    const browser = await chromium.launch({ headless: false })
    const page = await browser.newPage()

    // Configurar OpenAI con GPT-4o Mini
    const llm = openai.chat('gpt-4o-mini')
    const scraper = new LLMScraper(llm)

    // Navegar a una página simple
    console.log('📄 Navegando a una página de prueba...')
    await page.goto('https://example.com')

    // Definir esquema simple
    const schema = z.object({
      title: z.string().describe('Título de la página'),
      description: z.string().describe('Descripción de la página'),
    })

    console.log('🤖 Ejecutando scraper con GPT-4o Mini...')

    // Ejecutar scraper
    const { data } = await scraper.run(page, schema, {
      format: 'html',
    })

    console.log('\n📊 Resultados:')
    console.log(JSON.stringify(data, null, 2))

    await page.close()
    await browser.close()

    console.log('✅ ¡Prueba completada!')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testOpenAI() 