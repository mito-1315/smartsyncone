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
