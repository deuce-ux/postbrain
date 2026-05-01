const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

if (!fs.existsSync('./public/icons')) {
  fs.mkdirSync('./public/icons', { recursive: true })
}

sizes.forEach(size => {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  
  // Background - indigo #4F46E5
  ctx.fillStyle = '#4F46E5'
  ctx.fillRect(0, 0, size, size)
  
  // PB text in white
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `bold ${size * 0.35}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('PB', size / 2, size / 2)
  
  const buffer = canvas.toBuffer('image/png')
  fs.writeFileSync(path.join('./public/icons', `icon-${size}x${size}.png`), buffer)
  console.log(`Generated ${size}x${size}`)
})

console.log('All icons generated!')