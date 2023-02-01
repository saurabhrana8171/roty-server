const path = require('path');
const multer = require('multer');

const excelFilter = (req, file, cb) => {
  if (
    file.mimetype.includes('excel') ||
    file.mimetype.includes('spreadsheetml')
  ) {
    cb(null, true);
  } else {
    cb('Please upload only excel file.', false);
  }
};
const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './public');
  },
  filename: function (req, file, callback) {
    let extArray = file.mimetype.split('/');
    let extension = extArray[extArray.length - 1];
    var fileExt = path.extname(file.originalname);
    var fileName = file.originalname;
    fileName = fileName.split('.');
    fileName.splice(-1, 1);
    fileName.join('');
    fileName = fileName + '-' + new Date().getTime();
    var data = fileName + fileExt;
    callback(null, data);
  },
});
const uploadFile = multer({ storage: storage, fileFilter: excelFilter }).single(
  'excelSheet'
);

module.exports = { uploadFile };
