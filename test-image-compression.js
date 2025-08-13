const sharp = require('sharp');
const fs = require('fs');

async function testCompression() {
  console.log('Testing image compression...');
  
  // Create a test large image (white 2000x2000 image)
  const testImage = await sharp({
    create: {
      width: 2000,
      height: 2000,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  })
  .jpeg({ quality: 100 })
  .toBuffer();
  
  console.log(`Original test image size: ${(testImage.length / 1024 / 1024).toFixed(2)}MB`);
  
  // Test compression logic
  const TARGET_SIZE = 2 * 1024 * 1024; // 2MB
  let quality = 85;
  let processedBuffer;

  // First resize
  let sharp_instance = sharp(testImage).resize({
    width: 800,
    height: 600,
    fit: 'inside',
    withoutEnlargement: true
  });

  // Iterative compression
  do {
    processedBuffer = await sharp_instance
      .jpeg({
        quality: quality,
        progressive: true
      })
      .toBuffer();

    console.log(`Quality ${quality}%: ${(processedBuffer.length / 1024 / 1024).toFixed(2)}MB`);

    if (processedBuffer.length > TARGET_SIZE && quality > 30) {
      quality -= 10;
    } else {
      break;
    }
  } while (processedBuffer.length > TARGET_SIZE && quality >= 30);

  // If still too large, more aggressive resize
  if (processedBuffer.length > TARGET_SIZE) {
    console.log('Applying more aggressive resize...');
    
    sharp_instance = sharp(testImage).resize({
      width: 400,
      height: 300,
      fit: 'inside',
      withoutEnlargement: true
    });

    processedBuffer = await sharp_instance
      .jpeg({
        quality: 70,
        progressive: true
      })
      .toBuffer();
      
    console.log(`Final aggressive resize: ${(processedBuffer.length / 1024 / 1024).toFixed(2)}MB`);
  }

  console.log(`\nFinal compressed size: ${(processedBuffer.length / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Under 2MB target: ${processedBuffer.length <= TARGET_SIZE ? 'YES' : 'NO'}`);
}

testCompression().catch(console.error);
