const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../public/images'));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });

function imageFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
}

const upload = multer({ storage, fileFilter: imageFilter });

module.exports = upload;