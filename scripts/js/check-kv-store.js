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

async function checkKVStore() {
    console.log('🔍 Checking KV store for team data...\n');

    try {
        // Get all KV store entries
        const { data: kvEntries, error } = await supabase
            .from('kv_store')
            .select('*')
            .order('key');

        if (error) {
            console.error('Error fetching KV store:', error);
            return;
        }

        console.log(`Total KV store entries: ${kvEntries?.length || 0}`);
        console.log('='.repeat(80) + '\n');

        if (kvEntries && kvEntries.length > 0) {
            // Group entries by type
            const teamEntries = [];
            const progressEntries = [];
            const settingsEntries = [];
            const otherEntries = [];

            for (const entry of kvEntries) {
                const key = entry.key.toLowerCase();

                if (key.includes('team')) {
                    teamEntries.push(entry);
                } else if (key.includes('progress')) {
                    progressEntries.push(entry);
                } else if (key.includes('settings')) {
                    settingsEntries.push(entry);
                } else {
                    otherEntries.push(entry);
                }

                // Check specifically for tea cup
                if (key.includes('tea') || key.includes('cup')) {
                    console.log('⭐ POSSIBLE TEA CUP ENTRY:');
                    console.log(`   Key: ${entry.key}`);
                    console.log(`   Value: ${JSON.stringify(entry.value, null, 2)}`);
                    console.log();
                }
            }

            console.log('📊 KV Store Contents by Type:\n');

            if (teamEntries.length > 0) {
                console.log(`\n👥 TEAM ENTRIES (${teamEntries.length}):`);
                for (const entry of teamEntries) {
                    console.log(`  - ${entry.key}`);
                    if (entry.value && typeof entry.value === 'object') {
                        // Check for photo URLs in the value
                        const valueStr = JSON.stringify(entry.value);
                        if (valueStr.includes('photoUrl') || valueStr.includes('photo')) {
                            console.log('    📷 Contains photo data!');
                        }
                    }
                }
            }

            if (progressEntries.length > 0) {
                console.log(`\n📈 PROGRESS ENTRIES (${progressEntries.length}):`);
                for (const entry of progressEntries) {
                    console.log(`  - ${entry.key}`);
                    // Check for photos in progress
                    if (entry.value && typeof entry.value === 'object') {
                        let photoCount = 0;
                        const checkForPhotos = (obj) => {
                            for (const [key, val] of Object.entries(obj)) {
                                if (key === 'photoUrl' && val) {
                                    photoCount++;
                                } else if (typeof val === 'object' && val !== null) {
                                    checkForPhotos(val);
                                }
                            }
                        };
                        checkForPhotos(entry.value);
                        if (photoCount > 0) {
                            console.log(`    📷 ${photoCount} photo(s) found!`);
                        }
                    }
                }
            }

            if (settingsEntries.length > 0) {
                console.log(`\n⚙️ SETTINGS ENTRIES (${settingsEntries.length}):`);
                for (const entry of settingsEntries) {
                    console.log(`  - ${entry.key}`);
                }
            }

            if (otherEntries.length > 0) {
                console.log(`\n📦 OTHER ENTRIES (${otherEntries.length}):`);
                for (const entry of otherEntries) {
                    console.log(`  - ${entry.key}`);
                }
            }

            // Search for any team-related data containing photos
            console.log('\n' + '='.repeat(80));
            console.log('\n🔎 Searching for entries with photo data...\n');

            for (const entry of kvEntries) {
                const valueStr = JSON.stringify(entry.value);
                if (valueStr.includes('photoUrl') || valueStr.includes('thumbnail')) {
                    console.log(`📷 Entry with photos: ${entry.key}`);

                    // Try to extract photo URLs
                    const extractPhotos = (obj, path = '') => {
                        const photos = [];
                        for (const [key, val] of Object.entries(obj)) {
                            if (key === 'photoUrl' && val) {
                                photos.push({ path: path || 'root', url: val });
                            } else if (typeof val === 'object' && val !== null) {
                                photos.push(...extractPhotos(val, path ? `${path}.${key}` : key));
                            }
                        }
                        return photos;
                    };

                    const photos = extractPhotos(entry.value);
                    if (photos.length > 0) {
                        console.log(`   Found ${photos.length} photo(s):`);
                        photos.forEach(p => {
                            console.log(`     - ${p.path}: ${p.url.substring(0, 50)}...`);
                        });
                    }
                    console.log();
                }
            }

        } else {
            console.log('KV store is empty');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the check
checkKVStore();