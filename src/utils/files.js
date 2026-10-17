const { v2: cloudinary } = require('cloudinary');

// If CLOUDINARY_URL is set, uploads go to Cloudinary (required on Render/Netlify
// because their filesystems are ephemeral). Otherwise files stay on local disk
// under server/uploads and are served at /uploads/<name>.
const cloudEnabled = () => Boolean(process.env.CLOUDINARY_URL);

let configured = false;
function configure() {
  if (!configured) {
    cloudinary.config(); // reads CLOUDINARY_URL from env automatically
    configured = true;
  }
}

async function storeFile(file, folder = 'call2now') {
  if (!file) return null;
  if (file.filename) return `/uploads/${file.filename}`; // multer disk storage
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, res) => (err ? reject(err) : resolve(res.secure_url))
    );
    stream.end(file.buffer);
  });
}

module.exports = { storeFile, cloudEnabled };
