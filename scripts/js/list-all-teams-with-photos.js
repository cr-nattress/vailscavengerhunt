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

async function listAllTeamsWithPhotos() {
    console.log('📊 Listing all teams and their photo counts...\n');

    try {
        // Get all team mappings
        const { data: teamMappings, error: mappingError } = await supabase
            .from('team_mappings')
            .select('*')
            .order('team_name');

        if (mappingError) {
            console.error('Error fetching team mappings:', mappingError);
        }

        // Get all team progress
        const { data: allProgress, error: progressError } = await supabase
            .from('team_progress')
            .select('*');

        if (progressError) {
            console.error('Error fetching team progress:', progressError);
            return;
        }

        console.log(`Total teams with progress: ${allProgress?.length || 0}`);
        console.log(`Total team mappings: ${teamMappings?.length || 0}`);
        console.log('\n' + '='.repeat(80) + '\n');

        // Create a map for easier lookup
        const mappingsByTeamId = {};
        if (teamMappings) {
            teamMappings.forEach(m => {
                mappingsByTeamId[m.team_id] = m;
            });
        }

        // List all teams with photos
        const teamsWithPhotos = [];
        const teamsWithoutPhotos = [];

        for (const progress of allProgress || []) {
            const mapping = mappingsByTeamId[progress.team_id];

            let photoCount = 0;
            let completedCount = 0;
            const photoDetails = [];

            if (progress.progress) {
                for (const [stopName, stopData] of Object.entries(progress.progress)) {
                    if (stopData.done) completedCount++;
                    if (stopData.photoUrl) {
                        photoCount++;
                        photoDetails.push({
                            stop: stopName,
                            url: stopData.photoUrl
                        });
                    }
                }
            }

            const teamInfo = {
                teamId: progress.team_id,
                teamName: mapping?.team_name || 'Unknown',
                teamCode: mapping?.team_code || 'N/A',
                photoCount,
                completedCount,
                totalStops: progress.total_stops || 0,
                photoDetails
            };

            if (photoCount > 0) {
                teamsWithPhotos.push(teamInfo);
            } else {
                teamsWithoutPhotos.push(teamInfo);
            }
        }

        // Sort by photo count
        teamsWithPhotos.sort((a, b) => b.photoCount - a.photoCount);

        console.log('📷 TEAMS WITH PHOTOS:\n');
        for (const team of teamsWithPhotos) {
            console.log(`Team: ${team.teamName} (${team.teamCode})`);
            console.log(`  Team ID: ${team.teamId}`);
            console.log(`  Photos: ${team.photoCount} | Completed: ${team.completedCount}/${team.totalStops}`);

            // Check if this might be the tea cup team
            const lowerName = team.teamName.toLowerCase();
            const lowerCode = team.teamCode.toLowerCase();
            const lowerId = team.teamId.toLowerCase();

            if (lowerName.includes('tea') || lowerName.includes('cup') ||
                lowerCode.includes('tea') || lowerCode.includes('cup') ||
                lowerId.includes('tea') || lowerId.includes('cup')) {
                console.log('  ⭐ POSSIBLE TEA CUP TEAM MATCH! ⭐');
            }

            if (team.photoDetails.length > 0) {
                console.log('  Photo locations:');
                team.photoDetails.forEach(p => {
                    console.log(`    - ${p.stop}`);
                });
            }
            console.log();
        }

        console.log('\n' + '='.repeat(80) + '\n');
        console.log('⬜ TEAMS WITHOUT PHOTOS:\n');
        for (const team of teamsWithoutPhotos) {
            console.log(`${team.teamName} (${team.teamCode}) - Completed: ${team.completedCount}/${team.totalStops}`);
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n📊 SUMMARY:');
        console.log(`  Total teams: ${allProgress?.length || 0}`);
        console.log(`  Teams with photos: ${teamsWithPhotos.length}`);
        console.log(`  Teams without photos: ${teamsWithoutPhotos.length}`);
        console.log(`  Total photos uploaded: ${teamsWithPhotos.reduce((sum, t) => sum + t.photoCount, 0)}`);

    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the listing
listAllTeamsWithPhotos();