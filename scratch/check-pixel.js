import { Jimp } from 'jimp';

async function check() {
  try {
    for (const size of [16, 48, 128]) {
      const img = await Jimp.read(`dist/icon${size}.png`);
      const r = img.bitmap.data[0];
      const g = img.bitmap.data[1];
      const b = img.bitmap.data[2];
      const a = img.bitmap.data[3];
      console.log(`dist/icon${size}.png (0,0): R=${r}, G=${g}, B=${b}, A=${a}`);
    }
  } catch (e) {
    console.error(e);
  }
}

check();
