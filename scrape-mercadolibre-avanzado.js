import { chromium } from 'playwright'
import { z } from 'zod'
import { openai } from '@ai-sdk/openai'
import LLMScraper from './dist/index.js'
import dotenv from 'dotenv'

dotenv.config()

// Configuración del scraper
const CONFIG = {
  maxPaginas: 20,           // Número máximo de páginas a scrapear
  delayEntrePaginas: 2000,  // Delay entre páginas (ms)
  timeoutPagina: 60000,     // Timeout para cargar página (ms)
  delayCarga: 3000,         // Delay adicional para cargar contenido (ms)
  headless: false,          // Mostrar navegador (false) o ejecutar en segundo plano (true)
  guardarPorPagina: true,   // Guardar resultados por página individual
  maxReintentos: 3,         // Máximo número de reintentos por página
  maxProductosPorPagina: 50, // Máximo número de productos a extraer por página
}

async function main() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no está configurada en el archivo .env')
    }

    console.log('🚀 Iniciando scraping avanzado de Mercado Libre con GPT-4o Mini...')
    console.log(`📊 Configuración: ${CONFIG.maxPaginas} páginas, delay: ${CONFIG.delayEntrePaginas}ms`)
    console.log(`🛍️ Máximo productos por página: ${CONFIG.maxProductosPorPagina}`)

    const browser = await chromium.launch({ headless: CONFIG.headless })
    const page = await browser.newPage()
    const llm = openai.chat('gpt-4o-mini')
    const scraper = new LLMScraper(llm)

    // Esquema mejorado para extraer TODOS los productos
    const schema = z.object({
      productos: z.array(
        z.object({
          titulo: z.string().describe('Título completo del producto'),
          precio: z.string().describe('Precio actual del producto'),
          precio_anterior: z.string().optional().describe('Precio anterior si hay descuento'),
          descuento: z.string().optional().describe('Porcentaje de descuento'),
          ubicacion: z.string().optional().describe('Ubicación del vendedor'),
          envio_gratis: z.boolean().optional().describe('Si tiene envío gratis'),
          calificacion: z.string().optional().describe('Calificación del vendedor'),
          vendidos: z.string().optional().describe('Cantidad vendida'),
          enlace: z.string().describe('Enlace completo al producto'),
        })
      ).min(1).max(CONFIG.maxProductosPorPagina).describe(`EXTRAE TODOS los productos visibles en la página. NO limites la cantidad. Busca TODOS los elementos de producto, tarjetas de oferta, items de lista. Debe encontrar al menos 20-50 productos por página.`),
      pagina_actual: z.number().describe('Número de página actual'),
      total_productos: z.number().describe('Total de productos encontrados en esta página'),
      hay_siguiente_pagina: z.boolean().describe('Si hay una página siguiente disponible'),
      instrucciones_especiales: z.string().describe('Instrucciones adicionales para el LLM sobre cómo buscar productos'),
    })

    const todasLasPaginas = []
    const errores = []
    let paginasExitosas = 0

    for (let pagina = 1; pagina <= CONFIG.maxPaginas; pagina++) {
      let reintentos = 0
      let exito = false

      while (reintentos < CONFIG.maxReintentos && !exito) {
        try {
          console.log(`\n📄 Procesando página ${pagina} de ${CONFIG.maxPaginas} (intento ${reintentos + 1})...`)
          
          // Construir URL
          let url
          if (pagina === 1) {
            url = 'https://www.mercadolibre.com.ar/ofertas?promotion_type=deal_of_the_day#filter_applied=promotion_type&filter_position=3&origin=qcat'
          } else {
            url = `https://www.mercadolibre.com.ar/ofertas?promotion_type=deal_of_the_day&page=${pagina}#filter_applied=promotion_type&filter_position=3&origin=qcat`
          }

          console.log(`🌐 Navegando a: ${url}`)
          await page.goto(url, { 
            waitUntil: 'domcontentloaded', 
            timeout: CONFIG.timeoutPagina 
          })

          // Esperar a que cargue el contenido
          await page.waitForTimeout(CONFIG.delayCarga)

          // Verificar si la página tiene contenido
          const contenido = await page.content()
          if (!contenido.includes('producto') && !contenido.includes('item')) {
            console.log(`⚠️ Página ${pagina} parece estar vacía, saltando...`)
            break
          }

          console.log(`🤖 Ejecutando scraper en página ${pagina}...`)
          console.log(`🔍 Buscando TODOS los productos visibles en la página...`)

          const { data } = await scraper.run(page, schema, {
            format: 'html',
          })

          console.log(`✅ Página ${pagina} completada. Productos encontrados: ${data.total_productos}`)
          
          // Verificar si extrajo suficientes productos
          if (data.total_productos < 10) {
            console.log(`⚠️ Advertencia: Solo se encontraron ${data.total_productos} productos en la página ${pagina}`)
            console.log(`💡 Esto puede indicar que el LLM no está extrayendo todos los productos disponibles`)
          }
          
          // Agregar información de la página
          const paginaData = {
            numero_pagina: pagina,
            url: url,
            productos: data.productos,
            total_productos: data.total_productos,
            hay_siguiente_pagina: data.hay_siguiente_pagina,
            timestamp: new Date().toISOString(),
            instrucciones_especiales: data.instrucciones_especiales || "Sin instrucciones especiales"
          }
          
          todasLasPaginas.push(paginaData)
          paginasExitosas++

          // Guardar resultados por página si está habilitado
          if (CONFIG.guardarPorPagina) {
            const fs = await import('fs')
            fs.writeFileSync(
              `resultados_pagina_${pagina}.json`, 
              JSON.stringify(paginaData, null, 2)
            )
          }

          exito = true

        } catch (error) {
          reintentos++
          console.error(`❌ Error en página ${pagina} (intento ${reintentos}):`, error.message)
          
          if (reintentos >= CONFIG.maxReintentos) {
            errores.push({
              pagina: pagina,
              error: error.message,
              timestamp: new Date().toISOString()
            })
            console.log(`⚠️ Saltando página ${pagina} después de ${CONFIG.maxReintentos} intentos fallidos`)
          } else {
            console.log(`🔄 Reintentando página ${pagina} en 5 segundos...`)
            await page.waitForTimeout(5000)
          }
        }
      }

      // Delay entre páginas
      if (pagina < CONFIG.maxPaginas) {
        console.log(`⏳ Esperando ${CONFIG.delayEntrePaginas}ms antes de la siguiente página...`)
        await page.waitForTimeout(CONFIG.delayEntrePaginas)
      }
    }

    // Guardar resultados completos
    const fs = await import('fs')
    const resultadosCompletos = {
      configuracion: CONFIG,
      resumen: {
        total_paginas_procesadas: paginasExitosas,
        total_paginas_solicitadas: CONFIG.maxPaginas,
        paginas_con_errores: errores.length,
        fecha_inicio: new Date().toISOString(),
        fecha_fin: new Date().toISOString(),
        total_productos_extraidos: todasLasPaginas.reduce((sum, pagina) => sum + pagina.total_productos, 0),
        promedio_productos_por_pagina: todasLasPaginas.length > 0 ? 
          Math.round(todasLasPaginas.reduce((sum, pagina) => sum + pagina.total_productos, 0) / todasLasPaginas.length) : 0
      },
      errores: errores,
      paginas: todasLasPaginas
    }

    fs.writeFileSync('resultados_completos.json', JSON.stringify(resultadosCompletos, null, 2))

    await page.close()
    await browser.close()

    // Mostrar resumen final
    console.log('\n📊 Resumen final del scraping:')
    console.log(`✅ Páginas exitosas: ${paginasExitosas}/${CONFIG.maxPaginas}`)
    console.log(`❌ Páginas con errores: ${errores.length}`)
    console.log(`🛍️ Total de productos extraídos: ${resultadosCompletos.resumen.total_productos_extraidos}`)
    console.log(`📈 Promedio de productos por página: ${resultadosCompletos.resumen.promedio_productos_por_pagina}`)
    console.log(`📁 Archivos generados:`)
    console.log(`   - resultados_completos.json (todos los datos)`)
    if (CONFIG.guardarPorPagina) {
      for (let i = 1; i <= paginasExitosas; i++) {
        console.log(`   - resultados_pagina_${i}.json`)
      }
    }
    
    if (errores.length > 0) {
      console.log('\n⚠️ Errores encontrados:')
      errores.forEach(error => {
        console.log(`   - Página ${error.pagina}: ${error.error}`)
      })
    }

    console.log('🎉 ¡Scraping avanzado completado!')

  } catch (error) {
    console.error('❌ Error general:', error.message)
    process.exit(1)
  }
}

main() 