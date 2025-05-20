import express from 'express';
import bodyParser from 'body-parser';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ENV } from './config/env.config.js';
import { loadModels } from './middleware/face-api.middleware.js';
import faceRoutes from './routes/face.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(express.static(__dirname));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

app.use('/api', faceRoutes);

const startServer = async () => {
    try {
        await loadModels();
        
        app.listen(ENV.port, () => {
            console.log(`Server running on port ${ENV.port} in ${process.env.NODE_ENV || 'development'} mode`);
            if (ENV.isDev) {
                console.log(`Models path: ${ENV.modelsPath}`);
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Performing graceful shutdown');
    process.exit(0);
});

startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

