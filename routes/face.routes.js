import express from 'express';
import { compareFaceImages } from '../controllers/face.controller.js';

const router = express.Router();

router.post('/getImage', compareFaceImages);

export default router;
