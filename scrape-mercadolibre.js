import { chromium } from 'playwright'
import { z } from 'zod'
import { openai } from '@ai-sdk/openai'
import LLMScraper from './dist/index.js'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no está configurada en el archivo .env')
    }

    console.log('🚀 Iniciando scraping de ofertas del día en Mercado Libre con GPT-4o Mini...')

    const browser = await chromium.launch({ headless: false })
    const page = await browser.newPage()

    const url = 'https://www.mercadolibre.com.ar/ofertas?promotion_type=deal_of_the_day#filter_applied=promotion_type&filter_position=3&origin=qcat'
    console.log('📄 Navegando a:', url)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

    const llm = openai.chat('gpt-4o-mini')
    const scraper = new LLMScraper(llm)

    // Definir el esquema para extraer las ofertas del día
    const schema = z.object({
      ofertas: z.array(
        z.object({
          titulo: z.string().describe('Título del producto en oferta'),
          precio_actual: z.string().describe('Precio actual del producto'),
          precio_anterior: z.string().optional().describe('Precio anterior del producto, si está disponible'),
          porcentaje_descuento: z.string().optional().describe('Porcentaje de descuento, si está disponible'),
          calificacion: z.string().optional().describe('Calificación del producto, si está disponible'),
          enlace: z.string().describe('Enlace al producto'),
        })
      ).min(1).max(5).describe('Primeras 5 ofertas del día en Mercado Libre'),
    })

    console.log('🤖 Ejecutando el scraper con GPT-4o Mini...')

    const { data } = await scraper.run(page, schema, {
      format: 'html',
    })

    console.log('\n📊 Ofertas extraídas:')
    console.log(JSON.stringify(data.ofertas, null, 2))

    await page.close()
    await browser.close()

    console.log('✅ ¡Scraping de Mercado Libre completado!')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main() 