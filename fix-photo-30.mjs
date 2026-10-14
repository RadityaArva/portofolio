
import sharp from 'sharp';
const p = 'public/img/IMG_3466.JPG';
sharp(p)
  .rotate(30)
  .toFile(p + '.fixed30.jpg')
  .then(() => console.log('Fixed 30'))
  .catch(console.error);
