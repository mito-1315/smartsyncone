import express from 'express';
import { getHeadcount, processVideoAndUpdateCount } from '../controllers/head.controller.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.get('/headcount', getHeadcount);
router.post('/process-video', upload.single('video'), processVideoAndUpdateCount);

export default router;
