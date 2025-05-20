import express from 'express';
import { getHeadcount } from '../controllers/head.controller.js';

const router = express.Router();

router.get('/headcount', getHeadcount);

export default router;
