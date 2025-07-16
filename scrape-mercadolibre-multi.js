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

    console.log('🚀 Iniciando scraping de múltiples páginas en Mercado Libre con GPT-4o Mini...')

    const browser = await chromium.launch({ headless: false })
    const page = await browser.newPage()
    const llm = openai.chat('gpt-4o-mini')
    const scraper = new LLMScraper(llm)

    // Definir el esquema para extraer productos de cada página
    const schema = z.object({
      productos: z.array(
        z.object({
          titulo: z.string().describe('Título del producto'),
          precio: z.string().describe('Precio del producto'),
          ubicacion: z.string().optional().describe('Ubicación del vendedor'),
          envio_gratis: z.boolean().optional().describe('Si tiene envío gratis'),
          calificacion: z.string().optional().describe('Calificación del vendedor'),
          enlace: z.string().describe('Enlace al producto'),
        })
      ).min(1).describe('Productos encontrados en esta página'),
      pagina_actual: z.number().describe('Número de página actual'),
      total_productos: z.number().describe('Total de productos encontrados en esta página'),
    })

    const todasLasPaginas = []
    const maxPaginas = 20

    for (let pagina = 1; pagina <= maxPaginas; pagina++) {
      try {
        console.log(`\n📄 Procesando página ${pagina} de ${maxPaginas}...`)
        
        // Construir URL con parámetro de página
        let url
        if (pagina === 1) {
          url = 'https://www.mercadolibre.com.ar/ofertas?promotion_type=deal_of_the_day#filter_applied=promotion_type&filter_position=3&origin=qcat'
        } else {
          url = `https://www.mercadolibre.com.ar/ofertas?promotion_type=deal_of_the_day&page=${pagina}#filter_applied=promotion_type&filter_position=3&origin=qcat`
        }

        console.log(`🌐 Navegando a: ${url}`)
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

        // Esperar un poco para que la página cargue completamente
        await page.waitForTimeout(3000)

        console.log(`🤖 Ejecutando scraper en página ${pagina}...`)

        const { data } = await scraper.run(page, schema, {
          format: 'html',
        })

        console.log(`✅ Página ${pagina} completada. Productos encontrados: ${data.total_productos}`)
        
        // Agregar información de la página a los resultados
        const paginaData = {
          numero_pagina: pagina,
          url: url,
          productos: data.productos,
          total_productos: data.total_productos
        }
        
        todasLasPaginas.push(paginaData)

        // Guardar resultados parciales en un archivo
        const fs = await import('fs')
        fs.writeFileSync(
          `resultados_pagina_${pagina}.json`, 
          JSON.stringify(paginaData, null, 2)
        )

        // Esperar un poco entre páginas para no sobrecargar el servidor
        await page.waitForTimeout(2000)

      } catch (error) {
        console.error(`❌ Error en página ${pagina}:`, error.message)
        // Continuar con la siguiente página
        continue
      }
    }

    // Guardar todos los resultados en un archivo
    const fs = await import('fs')
    fs.writeFileSync(
      'resultados_completos.json', 
      JSON.stringify({
        total_paginas_procesadas: todasLasPaginas.length,
        fecha_scraping: new Date().toISOString(),
        paginas: todasLasPaginas
      }, null, 2)
    )

    await page.close()
    await browser.close()

    console.log('\n📊 Resumen del scraping:')
    console.log(`✅ Páginas procesadas: ${todasLasPaginas.length}`)
    console.log(`📁 Archivos generados:`)
    console.log(`   - resultados_completos.json (todos los datos)`)
    for (let i = 1; i <= todasLasPaginas.length; i++) {
      console.log(`   - resultados_pagina_${i}.json`)
    }
    console.log('🎉 ¡Scraping de múltiples páginas completado!')

  } catch (error) {
    console.error('❌ Error general:', error.message)
    process.exit(1)
  }
}

main() 