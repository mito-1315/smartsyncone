import express from 'express';
import { 
    getQRGenerator, 
    getSessionDetails, 
    createSessionDetails, 
    getNetworkInfo, 
    getQRScanner,
    stopSession 
} from '../controllers/qr.controller.js';

const router = express.Router();

router.get('/session-details', getSessionDetails);
router.post('/session/create', createSessionDetails);
router.get('/qr-generator', getQRGenerator);
router.get('/network-info', getNetworkInfo);
router.get('/qr-scanner', getQRScanner);

router.post('/session/stop', stopSession);

export default router;
