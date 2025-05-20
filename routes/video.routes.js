import express from 'express';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

router.get('/capture', (req, res) => {
    res.sendFile(join(__dirname, '../views/video.html'));
});

export default router;