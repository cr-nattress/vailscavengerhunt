import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyTeaCupPhoto() {
    console.log('🔍 Searching for Tea Cup team photo uploads...\n');

    try {
        // First, find teams with "tea cup" in the name
        const { data: teamMappings, error: mappingError } = await supabase
            .from('team_mappings')
            .select('*')
            .or('team_name.ilike.%tea%cup%,team_code.ilike.%tea%cup%');

        if (mappingError) {
            console.error('Error fetching team mappings:', mappingError);
            return;
        }

        console.log('Found team mappings:');
        console.log(JSON.stringify(teamMappings, null, 2));
        console.log('\n' + '='.repeat(60) + '\n');

        // Get progress for each matching team
        for (const mapping of teamMappings || []) {
            const { data: progress, error: progressError } = await supabase
                .from('team_progress')
                .select('*')
                .eq('team_id', mapping.team_id)
                .single();

            if (progressError) {
                console.log(`No progress found for team ${mapping.team_name} (${mapping.team_id})`);
                continue;
            }

            console.log(`📊 Team: ${mapping.team_name} (${mapping.team_code})`);
            console.log(`   Team ID: ${mapping.team_id}`);
            console.log(`   Organization: ${mapping.organization_id}`);
            console.log(`   Hunt: ${mapping.hunt_id}`);

            // Count photos in progress JSON
            if (progress && progress.progress) {
                const progressData = progress.progress;
                let photoCount = 0;
                const photos = [];

                for (const [stopName, stopData] of Object.entries(progressData)) {
                    if (stopData.photoUrl) {
                        photoCount++;
                        photos.push({
                            stop: stopName,
                            photoUrl: stopData.photoUrl,
                            thumbnailUrl: stopData.thumbnailUrl,
                            completedAt: stopData.completedAt,
                            publicId: stopData.publicId
                        });
                    }
                }

                console.log(`\n   📷 Photos uploaded: ${photoCount}`);

                if (photos.length > 0) {
                    console.log('\n   Photo details:');
                    photos.forEach((photo, index) => {
                        console.log(`   ${index + 1}. Stop: ${photo.stop}`);
                        console.log(`      URL: ${photo.photoUrl}`);
                        if (photo.thumbnailUrl) {
                            console.log(`      Thumbnail: ${photo.thumbnailUrl}`);
                        }
                        if (photo.completedAt) {
                            console.log(`      Completed: ${photo.completedAt}`);
                        }
                        console.log();
                    });
                }

                // Show all stops and their completion status
                console.log('\n   All stops status:');
                for (const [stopName, stopData] of Object.entries(progressData)) {
                    const status = stopData.done ? '✅' : '⬜';
                    const photo = stopData.photoUrl ? '📷' : '';
                    console.log(`   ${status} ${stopName} ${photo}`);
                }
            } else {
                console.log('   No progress data found');
            }

            console.log('\n' + '='.repeat(60) + '\n');
        }

        // Also search for any team_id containing "tea" or "cup"
        const { data: allProgress, error: allError } = await supabase
            .from('team_progress')
            .select('*')
            .or('team_id.ilike.%tea%,team_id.ilike.%cup%');

        if (!allError && allProgress && allProgress.length > 0) {
            console.log('Additional teams found by ID search:');
            for (const prog of allProgress) {
                // Skip if we already processed this team
                if (teamMappings?.some(m => m.team_id === prog.team_id)) continue;

                console.log(`\n📊 Team ID: ${prog.team_id}`);

                let photoCount = 0;
                if (prog.progress) {
                    for (const [stopName, stopData] of Object.entries(prog.progress)) {
                        if (stopData.photoUrl) {
                            photoCount++;
                        }
                    }
                }
                console.log(`   Photos uploaded: ${photoCount}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the verification
verifyTeaCupPhoto();