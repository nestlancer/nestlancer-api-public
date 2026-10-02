import { parentPort, workerData } from 'worker_threads';

import sharp from 'sharp';

async function processImage() {
  const { action, input, options } = workerData;

  try {
    let result;
    switch (action) {
      case 'resize':
        result = await sharp(input)
          .resize(options.width, options.height, { fit: options.fit })
          .toBuffer();
        break;
      case 'compress':
        result = await sharp(input)
          .webp({ quality: options.quality || 80 })
          .toBuffer();
        break;
      case 'metadata': {
        const metadata = await sharp(input).metadata();
        result = {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          colorSpace: metadata.space,
          exif: metadata.exif ? 'present' : undefined,
        };
        break;
      }
      case 'thumbnail':
        result = await sharp(input)
          .resize(300, 200, { fit: 'cover' })
          .webp({ quality: 70 })
          .toBuffer();
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    parentPort?.postMessage({ result });
  } catch (error: any) {
    parentPort?.postMessage({ error: error.message });
  }
}

processImage();
