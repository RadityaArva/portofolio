
import sharp from 'sharp';
const p = 'public/img/IMG_3466.JPG';
sharp(p)
  .rotate(180)
  .toFile(p + '.fixed.jpg')
  .then(() => console.log('Fixed'))
  .catch(console.error);
