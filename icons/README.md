# PWA Icons

Place your app icons here with the following sizes:
- icon-72.png (72x72)
- icon-96.png (96x96)
- icon-128.png (128x128)
- icon-144.png (144x144)
- icon-152.png (152x152)
- icon-192.png (192x192)
- icon-384.png (384x384)
- icon-512.png (512x512)

## Current Icons

Icons are generated for multiple platforms in `AppImages/`:
- **Android**: 6 icons (48px to 512px)
- **iOS**: 24 icons (16px to 1024px)
- **Windows 11**: 82 icons (various sizes and formats)

Total: 112 PNG files (~7.4MB)

## Icon Optimization

To reduce the total icon size, run these optimizations:

### Using pngquant (lossy, best compression):
```bash
# Install: brew install pngquant (Mac) or choco install pngquant (Windows)
find icons/AppImages -name "*.png" -exec pngquant --force --ext .png --quality=65-80 {} \;
```

### Using optipng (lossless):
```bash
# Install: brew install optipng (Mac) or choco install optipng (Windows)
find icons/AppImages -name "*.png" -exec optipng -o5 {} \;
```

### Online Tools:
- https://tinypng.com/ (batch upload, free up to 20 images)
- https://squoosh.app/ (single image, advanced options)

### Expected Results:
- pngquant: ~60-70% size reduction
- optipng: ~10-20% size reduction

## Quick Generation

You can generate these icons from a single 512x512 source image using tools like:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator
- Or use ImageMagick: `convert icon-512.png -resize 192x192 icon-192.png`

## Temporary SVG Icons

Until you add PNG icons, the app will use the emoji favicon as fallback.
