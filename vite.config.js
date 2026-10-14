import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import sharp from 'sharp'
import { existsSync } from 'node:fs'
import { resolve, sep } from 'node:path'

const storyPhotoPath = '/img/WhatsApp Image 2026-10-06 at 02.21.17.jpeg'
const publicImageRoot = resolve(__dirname, 'public', 'img')

async function createStoryAsset() {
  const source = resolve(publicImageRoot, storyPhotoPath.slice('/img/'.length))
  if (!source.startsWith(`${publicImageRoot}${sep}`)) {
    throw new Error(`Story photo source is outside public/img: ${storyPhotoPath}`)
  }

  let metadata
  try {
    metadata = await sharp(source).metadata()
  } catch (error) {
    throw new Error(`Unable to read Story photo metadata for ${storyPhotoPath}.`, { cause: error })
  }
  if (!metadata.width || !metadata.height) {
    throw new Error(`Story photo dimensions are unavailable for ${storyPhotoPath}.`)
  }

  const swapsDimensions = [5, 6, 7, 8].includes(metadata.orientation)
  const width = swapsDimensions ? metadata.height : metadata.width
  const height = swapsDimensions ? metadata.width : metadata.height
  const widths = [480, 800].filter(size => size < width)
  widths.push(width)
  const variants = [...new Set(widths)].map(size => ({
    width: size,
    file: `story-assets/story-01-${size}.webp`,
  }))
  const placeholder = await sharp(source)
    .rotate()
    .resize({ width: 24, withoutEnlargement: true })
    .blur(4)
    .webp({ quality: 30, effort: 4 })
    .toBuffer()

  return {
    src: storyPhotoPath,
    width,
    height,
    variants,
    placeholder: `data:image/webp;base64,${placeholder.toString('base64')}`,
  }
}

function storyPhotoAssets(story) {
  const source = resolve(publicImageRoot, story.src.slice('/img/'.length))
  const variantWidths = new Set(story.variants.map(variant => variant.width))

  const createVariant = width => sharp(source)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toBuffer()

  return {
    name: 'story-photo-assets',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url || '/', 'http://vite.local').pathname
        const match = pathname.match(/^\/story-assets\/story-01-(\d+)\.webp$/)
        if (!match || !variantWidths.has(Number(match[1]))) {
          next()
          return
        }

        try {
          const output = await createVariant(Number(match[1]))
          response.statusCode = 200
          response.setHeader('Content-Type', 'image/webp')
          response.setHeader('Cache-Control', 'public, max-age=3600')
          response.end(output)
        } catch (error) {
          next(error)
        }
      })
    },
    async buildStart() {
      for (const variant of story.variants) {
        const output = await createVariant(variant.width)
        this.emitFile({ type: 'asset', fileName: variant.file, source: output })
      }
    },
  }
}

export default defineConfig(async () => {
  const story = await createStoryAsset()

  return {
    define: {
      __STORY_ASSET__: JSON.stringify(story),
    },
    plugins: [tailwindcss(), storyPhotoAssets(story)],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          photography: resolve(__dirname, 'photography.html'),
          ...(existsSync(resolve(__dirname, 'projects.html'))
            ? { projects: resolve(__dirname, 'projects.html') }
            : {}),
        },
      },
    },
  }
})