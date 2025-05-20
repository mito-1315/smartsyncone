import { supabase } from '../config/db.config.js';
import { processImage, comparefaces } from '../services/face.service.js';

export async function compareFaceImages(req, res) {
    try {
        const { rollNo, capturedImage } = req.body;
        
        if (!rollNo || !capturedImage) {
            return res.status(400).json({
                success: false,
                error: 'Roll number and captured image are required'
            });
        }

        const { data, error } = await supabase
            .from('student')
            .select('image1, image2, image3')
            .eq('rollNo', rollNo)
            .single();

        if (error || !data) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }

        if (!data.image1 && !data.image2 && !data.image3) {
            return res.status(404).json({
                success: false,
                error: 'No reference images found for this student'
            });
        }

        // Process the captured image
        const processedLiveImage = await processImage(capturedImage);
        
        // Process only available database images
        const imagestoProcess = [data.image1, data.image2, data.image3].filter(img => img);
        const processedDBImages = await Promise.all(
            imagestoProcess.map(img => processImage(img))
        );

        // Compare with each database image
        const comparisonResults = await Promise.all(
            processedDBImages.map(dbImage => comparefaces(processedLiveImage, dbImage))
        );

        // Find the best match
        const bestMatch = comparisonResults.reduce((best, current) => {
            return (current.similarity > best.similarity) ? current : best;
        }, { similarity: 0 });

        // Consider it a match if any comparison is true
        const isMatch = comparisonResults.some(result => result.isSamePerson);

        res.json({
            success: true,
            isMatch,
            bestMatchPercentage: bestMatch.similarity,
            confidenceScore: bestMatch.distance
        });
    } catch (error) {
        console.error('Face comparison error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal server error during face comparison'
        });
    }
}
