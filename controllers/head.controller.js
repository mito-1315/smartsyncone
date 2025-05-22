import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { updateHeadCount, uploadVideoToSupabase, updateStudentCount } from '../services/session.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getHeadcount = (req, res) => {
    console.log('Serving headcount page');
    res.sendFile(path.join(__dirname, '../screens/headcount.html'));
};

export const processVideoAndUpdateCount = async (req, res) => {
    console.log('processVideoAndUpdateCount called');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    if (!req.file) {
        console.error('No video file uploaded');
        return res.status(400).json({ success: false, error: 'No video file uploaded' });
    }

    const sessionID = req.body.sessionID;
    if (!sessionID) {
        console.error('No sessionID provided');
        return res.status(400).json({ success: false, error: 'No sessionID provided' });
    }

    console.log('Processing video for session:', sessionID);

    try {
        // First, upload the video to Supabase
        console.log('Uploading video to Supabase');
        const uploadResult = await uploadVideoToSupabase(req.file, sessionID);
        
        if (!uploadResult.success) {
            console.error('Failed to upload video:', uploadResult.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload video: ' + uploadResult.error
            });
        }

        console.log('Video uploaded successfully:', uploadResult);

        // Now process the video for headcount
        const videoPath = req.file.path;
        console.log('Processing video from path:', videoPath);
        
        const pythonScript = path.join(__dirname, '../scripts/app.py');
        const pythonPath = path.join(__dirname, '../venv/bin/python3');
        
        console.log('Spawning Python process with:', { pythonPath, pythonScript, videoPath });
        const pythonProcess = spawn(pythonPath, [pythonScript, videoPath]);
        
        let result = '';
        let error = '';

        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
            console.log('Python stdout:', data.toString());
        });

        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
            console.error('Python stderr:', data.toString());
        });

        pythonProcess.on('close', async (code) => {
            console.log('Python process closed with code:', code);
            
            if (code !== 0) {
                console.error('Python script error:', error);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Error processing video: ' + error
                });
            }

            try {
                console.log('Raw Python output:', result);
                const processedResult = JSON.parse(result);
                console.log('Parsed results:', processedResult);

                // Update the headcount in the database
                console.log('Updating headcount in database:', {
                    sessionID,
                    headCount: processedResult.results.max_person_count,
                    videoUrl: uploadResult.publicUrl
                });

                const updateResult = await updateHeadCount(
                    sessionID, 
                    processedResult.results.max_person_count,
                    uploadResult.publicUrl
                );
                console.log('Database update result:', updateResult);

                if (!updateResult.success) {
                    throw new Error(updateResult.error || 'Failed to update database');
                }

                // Update student count
                console.log('Updating student count');
                const studentCountResult = await updateStudentCount(sessionID);
                console.log('Student count update result:', studentCountResult);

                if (!studentCountResult.success) {
                    throw new Error(studentCountResult.error || 'Failed to update student count');
                }

                res.json({
                    success: true,
                    results: processedResult.results,
                    videoUrl: uploadResult.publicUrl,
                    updateResult,
                    studentCount: studentCountResult.studentCount
                });
            } catch (parseError) {
                console.error('Error in processing or database update:', parseError);
                res.status(500).json({
                    success: false,
                    error: parseError.message || 'Error processing results'
                });
            }
        });
    } catch (error) {
        console.error('Video processing error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const updateSessionHeadCount = async (req, res) => {
    const { sessionID, headCount } = req.body;
    console.log('updateSessionHeadCount called with:', { sessionID, headCount });

    if (!sessionID || headCount === undefined) {
        console.error('Missing required parameters');
        return res.status(400).json({
            success: false,
            error: 'Missing sessionID or headCount'
        });
    }

    try {
        console.log('Calling service to update headcount');
        const result = await updateHeadCount(sessionID, headCount);
        console.log('Service response:', result);
        res.json(result);
    } catch (error) {
        console.error('Headcount update error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
