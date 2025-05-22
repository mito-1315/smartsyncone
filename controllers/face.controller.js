import { supabase } from '../config/db.config.js';
import { processImage, comparefaces } from '../services/face.service.js';

export async function compareFaceImages(req, res) {
    try {
        const { rollNo, capturedImage, sessionId } = req.body;
        console.log('Received data:', { rollNo, capturedImage, sessionId });
        if (!rollNo || !capturedImage) {
            return res.status(400).json({
                success: false,
                error: 'Roll number and captured image are required'
            });
        }

        // Store the attendance record with sessionId if provided
        if (sessionId) {
            await supabase.from('attendance').insert([{
                sessionID: sessionId,
                rollNo: rollNo,
                timestamp: new Date().toISOString()
            }]);
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

        if (isMatch && sessionId) {
            console.log('Match found! Updating session with ID:', sessionId);
            
            const { data: sessionData, error: sessionError } = await supabase
                .from('Session')
                .select('students')
                .eq('sessionID', sessionId)
                .single();

            console.log('Session query result:', { sessionData, sessionError });

            if (!sessionError) {
                // Parse existing students JSON document
                let existingStudents = {};
                try {
                    const studentsDoc = JSON.parse(sessionData?.students || '{"students":{}}');
                    existingStudents = studentsDoc.students || {};
                    console.log('Parsed existing students document:', studentsDoc);
                    console.log('Extracted students object:', existingStudents);
                } catch (e) {
                    console.log('Error parsing students JSON:', e);
                    console.log('Raw students data:', sessionData?.students);
                }

                // Create updated students JSON document with timestamp
                const updatedStudentsDoc = {
                    students: {
                        ...existingStudents,
                        [rollNo]: {
                            present: true,
                            timestamp: new Date().toISOString()
                        }
                    }
                };
                
                console.log('New students document to upload:', updatedStudentsDoc);
                console.log('Stringified JSON to upload:', JSON.stringify(updatedStudentsDoc));

                // Update with new JSON document
                const { error: updateError } = await supabase
                    .from('Session')
                    .update({ students: JSON.stringify(updatedStudentsDoc) })
                    .eq('sessionID', sessionId);

                if (updateError) {
                    console.error('Error updating session:', updateError);
                    console.error('Failed document:', updatedStudentsDoc);
                } else {
                    console.log('Session successfully updated!');
                    console.log('Final students document:', updatedStudentsDoc);
                }
            }
        }

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
