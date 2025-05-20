import { supabase } from '../config/db.config.js';
import { processImage, comparefaces } from '../services/face.service.js';

export async function compareFaceImages(req, res) {
    try {
        const rollNo = parseInt(req.body.rollNo);
        
        const { data, error } = await supabase
            .from('student')
            .select('image1, image2')
            .eq('rollNo', rollNo)
            .single();

        if (error) throw error;

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
}
