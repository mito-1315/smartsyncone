import * as faceapi from 'face-api.js';
import canvas from 'canvas';
import { ENV } from '../config/env.config.js';

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

export const loadModels = async () => {
    try {
        await faceapi.tf.setBackend('cpu');
        await faceapi.tf.ready();
        
        await Promise.all([
            faceapi.nets.faceRecognitionNet.loadFromDisk(ENV.modelsPath),
            faceapi.nets.faceLandmark68Net.loadFromDisk(ENV.modelsPath),
            faceapi.nets.ssdMobilenetv1.loadFromDisk(ENV.modelsPath)
        ]);
        console.log('Models loaded successfully from:', ENV.modelsPath);
    } catch (error) {
        console.error('Error loading models:', error);
        throw error;
    }
};
