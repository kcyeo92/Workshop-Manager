import express from 'express';
import multer from 'multer';
import { uploadTaskPhotos, getPhotos, getPhotoById } from '../controllers/photosController';

const router = express.Router();

// Configure multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// Upload photos
router.post('/upload', upload.array('photos', 10), uploadTaskPhotos);

// Get photos for a task
router.get('/', getPhotos);

// Get photo content by ID
router.get('/:fileId', getPhotoById);

export default router;

