import sharp from 'sharp'

const TEXT = 'Techpivo'

export async function watermarkImage(input: any): Promise<Buffer> {
  const image = sharp(input)
  const meta = await image.metadata()
  const width = meta.width || 1200
  const height = meta.height || 800

  const svg = `<svg width="${width}" height="${height}">
    <text
      x="${width - 20}"
      y="${height - 20}"
      font-family="Arial, Helvetica, sans-serif"
      font-size="${Math.max(24, Math.round(width / 25))}"
      font-weight="bold"
      fill="rgba(255,255,255,0.45)"
      text-anchor="end"
      dominant-baseline="baseline"
    >${TEXT}</text>
  </svg>`

  const result = await image
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .toBuffer()

  return result
}
