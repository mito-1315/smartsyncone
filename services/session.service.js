import { supabase } from '../config/db.config.js';

export async function createSession(staffID) {
    try {
        // Get staff details
        //console.log('Staff ID:', staffID);
        const { data: staffData, error: staffError } = await supabase
            .from('staff')
            .select('staffName')
            .eq('staffID', staffID)
            .single();

        console.log('Staff Query Result:', staffData);

        if (staffError || !staffData) {
            throw new Error('Staff not found');
        }

        const dateTime = new Date().toISOString();
        const sessionID = generateSessionId();

        // Check if sessionId exists
        const { data: existingSession } = await supabase
            .from('Session')
            .select('sessionID')
            .eq('sessionID', sessionID)
            .single();
        //console.log('Existing Session:', existingSession);
        // If sessionId exists, generate a new one
        if (existingSession) {
            return createSession(staffID);
        }

        // Insert new session
        const { data, error } = await supabase
            .from('Session')
            .insert([
                {
                    sessionID,
                    staffID,
                    dateTime
                }
            ])
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            sessionID,
            staffID,
            staffName: staffData.staffName,
            dateTime
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

function generateSessionId() {
    // Generate a random 8-digit number
    return Math.floor(10000000 + Math.random() * 90000000);
}

export async function stopSessionDB(sessionID, qrStop) {
    try {
        const { error } = await supabase
            .from('Session')
            .update({ qrStop })
            .eq('sessionID', sessionID);

        if (error) throw error;

        return {
            success: true
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

export async function uploadVideoToSupabase(file, sessionID) {
    console.log('Uploading video to Supabase storage:', { sessionID });
    
    try {
        // Create a unique filename using sessionID and timestamp
        const timestamp = new Date().getTime();
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${sessionID}_${timestamp}.${fileExt}`;
        
        // Upload to Supabase storage
        const { data, error } = await supabase.storage
            .from('videos')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600'
            });

        if (error) {
            console.error('Supabase storage error:', error);
            throw error;
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
            .from('videos')
            .getPublicUrl(fileName);

        console.log('Video uploaded successfully:', { fileName, publicUrl });
        
        // Update the session with the video URL
        const { data: sessionData, error: updateError } = await supabase
            .from('Session')
            .update({ headCountVideo: publicUrl })
            .eq('sessionID', sessionID)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating session with video URL:', updateError);
            throw updateError;
        }

        return {
            success: true,
            publicUrl,
            sessionData
        };
    } catch (error) {
        console.error('Error in uploadVideoToSupabase:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

export async function updateHeadCount(sessionID, headCount, videoUrl = null) {
    console.log('updateHeadCount service called with:', { sessionID, headCount, videoUrl });
    
    try {
        console.log('Making Supabase query to update headcount');
        const updateData = { headCount };
        if (videoUrl) {
            updateData.headCountVideo = videoUrl;
        }

        const { data, error } = await supabase
            .from('Session')
            .update(updateData)
            .eq('sessionID', sessionID)
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Supabase update successful:', data);
        return {
            success: true,
            data
        };
    } catch (error) {
        console.error('Error in updateHeadCount service:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

export async function updateStudentCount(sessionID) {
    console.log('Updating student count for session:', sessionID);
    
    try {
        // First get the students array from the session
        const { data: sessionData, error: fetchError } = await supabase
            .from('Session')
            .select('students')
            .eq('sessionID', sessionID)
            .single();

        if (fetchError) {
            console.error('Error fetching session data:', fetchError);
            throw fetchError;
        }

        // Count the number of students
        const parsedStudents = JSON.parse(sessionData.students); // parse the inner string
        const studentCount = parsedStudents.students ? Object.keys(parsedStudents.students).length : 0;
        //const studentCount = sessionData.students ? Object.keys(sessionData.students).length : 0;
        console.log('Found students:', studentCount);

        // Update the studentCount in the session
        const { data, error: updateError } = await supabase
            .from('Session')
            .update({ studentCount })
            .eq('sessionID', sessionID)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating student count:', updateError);
            throw updateError;
        }

        console.log('Successfully updated student count:', data);
        return {
            success: true,
            data,
            studentCount
        };
    } catch (error) {
        console.error('Error in updateStudentCount:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
