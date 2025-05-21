import express from 'express';
import { getQRGenerator, getSessionDetails, createSessionDetails, getNetworkInfo } from '../controllers/qr.controller.js';

const router = express.Router();

router.get('/session-details', getSessionDetails);
router.post('/session/create', createSessionDetails);
router.get('/qr-generator', getQRGenerator);
router.get('/network-info', getNetworkInfo);

export default router;
