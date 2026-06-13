import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';

const sourceImg = 'C:\\Users\\sreek\\.gemini\\antigravity\\brain\\607e5179-f549-4a03-acfc-c3ec9239ef01\\carryai_logo_source_1781354783996.png';
const publicDir = path.resolve('public');

async function processIcons() {
  try {
    console.log('Reading source image...', sourceImg);
    const image = await Jimp.read(sourceImg);
    const width = image.width;
    const height = image.height;
    console.log(`Source dimensions: ${width}x${height}`);

    const cx = width / 2;
    const cy = height / 2;
    
    // Outer boundary of the black circle (approx 42% of the image width)
    const outerRadius = width * 0.425;
    // Inner boundary of the white ring (approx 36% of the image width)
    const innerRingRadius = width * 0.365;

    console.log(`Processing transparency and removing white outline ring (radius zone: ${innerRingRadius.toFixed(1)} to ${outerRadius.toFixed(1)})...`);

    // Scan and modify pixels in-place
    image.scan(0, 0, width, height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > outerRadius) {
        // 1. Outside the logo: make all white/light pixels transparent
        if (r > 230 && g > 230 && b > 230) {
          this.bitmap.data[idx + 3] = 0; // Alpha = 0 (Transparent)
        }
      } else if (distance >= innerRingRadius && distance <= outerRadius) {
        // 2. White Ring Zone: turn the white ring pixels to black to match the logo circle
        if (r > 200 && g > 200 && b > 200) {
          // Set to the logo's deep charcoal black (#1C1917)
          this.bitmap.data[idx + 0] = 28;
          this.bitmap.data[idx + 1] = 25;
          this.bitmap.data[idx + 2] = 23;
          this.bitmap.data[idx + 3] = 255;
        }
      }
      // 3. Inside innerRingRadius: leave completely alone (keeps the cream capsule untouched)
    });

    const sizes = [16, 48, 128];
    
    for (const size of sizes) {
      const resized = image.clone();
      
      // Resize
      await resized.resize({ w: size, h: size });
      
      const outPath = path.join(publicDir, `icon${size}.png`);
      
      try {
        await resized.write(outPath);
      } catch (e) {
        if (typeof resized.writeAsync === 'function') {
          await resized.writeAsync(outPath);
        } else {
          throw e;
        }
      }
      
      console.log(`Generated transparent, ring-free icon${size}.png`);
    }
    
    console.log('All transparent icons generated successfully!');
  } catch (error) {
    console.error('Error processing icons:', error);
  }
}

processIcons();
