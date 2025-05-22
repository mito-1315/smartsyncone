import path from 'path';
import { fileURLToPath } from 'url';
import { createSession, stopSessionDB } from '../services/session.service.js';
import { networkInterfaces } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getSessionDetails = (req, res) => {
    res.sendFile(path.join(__dirname, '../screens/session-details.html'));
};

export const createSessionDetails = async (req, res) => {
    const { staffId } = req.body;
    const result = await createSession(staffId);
    res.json(result);
};

export const getQRGenerator = (req, res) => {
    res.sendFile(path.join(__dirname, '../screens/qr-generator.html'));
};

export const getQRScanner = (req, res) => {
    res.sendFile(path.join(__dirname, '../screens/qr-scanner.html'));
};

export const getNetworkInfo = (req, res) => {
    const nets = networkInterfaces();
    let ip = '';

    // Find the WiFi IP address
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip internal and non-IPv4 addresses
            if (!net.internal && net.family === 'IPv4') {
                ip = net.address;
                break;
            }
        }
        if (ip) break;
    }

    res.json({ ip });
};

export const stopSession = async (req, res) => {
    const { sessionID, qrStop } = req.body;
    console.log('Received stop session request:', { sessionID, qrStop });

    try {
        const result = await stopSessionDB(sessionID, qrStop);
        
        if (!result.success) {
            console.error('Failed to update session:', result.error);
            res.status(500).json(result);
            return;
        }

        console.log('Successfully stopped session:', sessionID);
        res.json(result);
    } catch (err) {
        console.error('Unexpected error in stop session:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
