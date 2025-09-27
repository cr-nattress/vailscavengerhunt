import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function updateStops() {
  console.log('Updating kv_store with new production stop data...');

  // New production stops
  const stops = [
    {
      stop_id: 'stop_1',
      title: 'Covered Bridge',
      description: 'An iconic wooden crossing and the most photographed landmark in Vail Village.',
      clue: 'The wooden crossing every skier knows.',
      hints: [
        'Framed by alpine charm, it connects more than just paths.',
        'Everyone lines up here for the classic Vail photo — wood beams above, creek rushing below.'
      ],
      position_lat: 39.6403,
      position_lng: -106.3742,
      address: 'Covered Bridge, Vail Village, CO 81657'
    },
    {
      stop_id: 'stop_2',
      title: 'Chair Lift',
      description: 'The gateway to the mountain — chairs rise above, waiting for the next ride skyward.',
      clue: 'Where empty chairs hang high, waiting for riders.',
      hints: [
        'Suspended seats rising skyward, even when the snow is gone.',
        'Look toward the base where the ride into the mountains begins, cables stretching overhead.'
      ],
      position_lat: 39.6421,
      position_lng: -106.3783,
      address: 'Gondola One, Vail Village, CO 81657'
    },
    {
      stop_id: 'stop_3',
      title: 'Gore Range',
      description: 'Jagged peaks on the eastern horizon, defining Vail\'s dramatic mountain backdrop.',
      clue: 'Find the Gore Range.',
      hints: [
        'Look east where jagged peaks break the skyline.',
        'From the heart of the village, lift your gaze — the rugged horizon fills your view behind the shops.'
      ],
      position_lat: 39.6410,
      position_lng: -106.3750,
      address: 'Gore Range Viewpoint, Vail, CO 81657'
    },
    {
      stop_id: 'stop_4',
      title: 'Public Art / Sculpture',
      description: 'A permanent piece of art in the village plaza, celebrating mountain life in bronze or stone.',
      clue: 'Discover a piece of art.',
      hints: [
        'Bronze and stone tell the stories of mountain life.',
        'A figure frozen in time stands in the plaza, admired by passersby and posed for photos.'
      ],
      position_lat: 39.6405,
      position_lng: -106.3745,
      address: 'Vail Village Plaza, CO 81657'
    },
    {
      stop_id: 'stop_5',
      title: 'Water\'s Edge',
      description: 'A peaceful fountain and flowing creek at the village center, bringing sound and movement.',
      clue: 'In the heart of the village, discover where water brings life and movement.',
      hints: [
        'Flowing quietly, yet everyone gathers nearby.',
        'Steps away from shops and patios, cool spray and rippling sound remind you that the mountains always flow through here.'
      ],
      position_lat: 39.6402,
      position_lng: -106.3740,
      address: 'Gore Creek, Vail Village, CO 81657'
    }
  ];

  try {
    // First, delete existing stops for this hunt
    console.log('Clearing existing stops...');
    const { error: deleteError } = await supabase
      .from('kv_store')
      .delete()
      .like('key', 'bhhs/fall-2025/stops/%');

    if (deleteError) {
      console.error('Error deleting old stops:', deleteError);
    } else {
      console.log('✅ Cleared existing stops');
    }

    // Insert each new stop
    for (const stop of stops) {
      const key = `bhhs/fall-2025/stops/${stop.stop_id}`;

      const { data, error } = await supabase
        .from('kv_store')
        .upsert({
          key: key,
          value: stop,
          indexes: [`stop:${stop.stop_id}`, 'type:stop', 'org:bhhs', 'hunt:fall-2025']
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error(`Error inserting ${stop.stop_id}:`, error);
      } else {
        console.log(`✅ Inserted ${stop.stop_id}: ${stop.title}`);
      }
    }

    // Update stops index
    const stopsIndex = {
      key: 'bhhs/fall-2025/stops/index',
      value: {
        stop_ids: stops.map(s => s.stop_id),
        count: stops.length,
        updated_at: new Date().toISOString()
      },
      indexes: ['type:stops_index', 'org:bhhs', 'hunt:fall-2025']
    };

    const { error: indexError } = await supabase
      .from('kv_store')
      .upsert(stopsIndex, { onConflict: 'key' });

    if (indexError) {
      console.error('Error updating stops index:', indexError);
    } else {
      console.log('✅ Updated stops index');
    }

    // Verify the data
    console.log('\nVerifying data...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('kv_store')
      .select('*')
      .like('key', 'bhhs/fall-2025/stops/%');

    if (verifyError) {
      console.error('Error verifying data:', verifyError);
    } else {
      console.log(`✅ Found ${verifyData.length} stop entries in kv_store`);

      // Show the titles to confirm
      const stopTitles = verifyData
        .filter(item => !item.key.includes('/index'))
        .map(item => item.value?.title)
        .filter(Boolean);
      console.log('Stop titles:', stopTitles);
    }

  } catch (error) {
    console.error('Error updating stops:', error);
  }
}

// Run the script
updateStops().then(() => {
  console.log('Done! Production stops have been updated.');
  process.exit(0);
}).catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});