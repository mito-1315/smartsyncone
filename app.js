import express from 'express';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bodyParser from 'body-parser';
import * as faceapi from 'face-api.js';
import canvas from 'canvas';
import fetch from 'node-fetch';
import sharp from 'sharp';
import videoRoutes from './routes/video.routes.js';

// Fix dirname initialization
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename); // Fixed: Use __filename instead of __dirname

// Canvas setup for face-api
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Initialize environment
const ENV = {
    isDev: process.env.NODE_ENV !== 'production',
    modelsPath: join(__dirname, 'models'),
    port: process.env.PORT || 3000
};

// Database connection
dotenv.config();
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const app = express();

// Middleware
app.use(express.static(__dirname));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Update model loading with better error handling
const loadModels = async () => {
    try {
        // Set CPU as the backend
        await faceapi.tf.setBackend('cpu');
        await faceapi.tf.ready();
        
        // Load models with explicit path
        await Promise.all([
            faceapi.nets.faceRecognitionNet.loadFromDisk(ENV.modelsPath),
            faceapi.nets.faceLandmark68Net.loadFromDisk(ENV.modelsPath),
            faceapi.nets.ssdMobilenetv1.loadFromDisk(ENV.modelsPath)
        ]);
        console.log('Models loaded successfully from:', ENV.modelsPath);
    } catch (error) {
        console.error('Error loading models:', error);
        throw error; // Let the caller handle the error
    }
};

async function processImage(imageUrl) {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer(); // Use arrayBuffer instead of buffer
    const imageBuffer = Buffer.from(arrayBuffer);
    
    // Resize image to have same width (800px) maintaining aspect ratio
    const processedBuffer = await sharp(imageBuffer, {
        limitInputPixels: false // Add this to prevent large image errors
    })
        .resize(800, null, { 
            withoutEnlargement: true,
            fit: 'inside'
        })
        .toBuffer();
    
    const img = await canvas.loadImage(processedBuffer);
    return img;
}

async function comparefaces(img1, img2) {
    // Detect faces in both images
    const detection1 = await faceapi.detectSingleFace(img1)
        .withFaceLandmarks()
        .withFaceDescriptor();
    const detection2 = await faceapi.detectSingleFace(img2)
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection1 || !detection2) {
        throw new Error('Could not detect face in one or both images');
    }

    // Compare face descriptors
    const distance = faceapi.euclideanDistance(
        detection1.descriptor,
        detection2.descriptor
    );

    // Distance threshold for matching (lower means more strict)
    const threshold = 0.6;
    const isSamePerson = distance < threshold;

    return {
        isSamePerson,
        similarity: (1 - distance) * 100,
        distance
    };
}

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Serve static files from public directory
app.use(express.static(join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

app.get('/face', (req, res) => {
    res.sendFile(join(__dirname, 'views/face.html'));
});

app.use('/video', videoRoutes);

// Handle roll number submission with face comparison
app.post('/getImage', async (req, res) => {
    try {
        const rollNo = parseInt(req.body.rollNo);
        
        const { data, error } = await supabase
            .from('student')
            .select('image1, image2')
            .eq('rollNo', rollNo)
            .single();

        if (error) throw error;

        // Process and compare images
        const [processedImg1, processedImg2] = await Promise.all([
            processImage(data.image1),
            processImage(data.image2)
        ]);

        const comparisonResult = await comparefaces(processedImg1, processedImg2);

        res.json({ 
            image1: data.image1,
            image2: data.image2,
            comparison: comparisonResult,
            success: true 
        });
    } catch (error) {
        res.status(500).json({ error: error.message, success: false });
    }
});

// Update server startup
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

// Add process error handlers with graceful shutdown
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    // Don't exit for unhandled rejections, but log them
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Performing graceful shutdown');
    process.exit(0);
});

startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

