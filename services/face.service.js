import * as faceapi from 'face-api.js';
import canvas from 'canvas';
import fetch from 'node-fetch';
import sharp from 'sharp';

export async function processImage(imageData) {
    let imageBuffer;
    
    if (imageData.startsWith('data:image')) {
        // Handle base64 image data
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
        // Handle URL
        const response = await fetch(imageData);
        const arrayBuffer = await response.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
    }
    
    const processedBuffer = await sharp(imageBuffer, {
        limitInputPixels: false
    })
        .resize(800, null, { 
            withoutEnlargement: true,
            fit: 'inside'
        })
        .toBuffer();
    
    return await canvas.loadImage(processedBuffer);
}

export async function comparefaces(img1, img2) {
    const detection1 = await faceapi.detectSingleFace(img1)
        .withFaceLandmarks()
        .withFaceDescriptor();
    const detection2 = await faceapi.detectSingleFace(img2)
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection1 || !detection2) {
        throw new Error('Could not detect face in one or both images');
    }

    const distance = faceapi.euclideanDistance(
        detection1.descriptor,
        detection2.descriptor
    );

    const threshold = 0.6;
    const isSamePerson = distance < threshold;

    return {
        isSamePerson,
        similarity: (1 - distance) * 100,
        distance
    };
}
