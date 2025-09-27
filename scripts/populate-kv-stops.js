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

async function populateStops() {
  console.log('Populating kv_store with stop data...');

  // Define stops with clues and hints
  const stops = [
    {
      stop_id: 'stop_1',
      title: 'The Heart of Vail',
      description: 'Historic covered bridge in Vail Village',
      clue: 'Where waters flow beneath wooden beams, find the covered passage where mountain dreams cross streams.',
      hints: [
        'Look for the wooden structure spanning Gore Creek',
        'It\'s near the center of Vail Village',
        'You can walk across it'
      ],
      position_lat: 39.6403,
      position_lng: -106.3742,
      address: 'Covered Bridge, Vail, CO 81657'
    },
    {
      stop_id: 'stop_2',
      title: 'Mountain Flora Paradise',
      description: 'Highest botanical garden in North America',
      clue: 'At elevation\'s peak where flowers bloom, seek the garden that defies altitude\'s gloom.',
      hints: [
        'It\'s the highest botanical garden in North America',
        'Named after a former First Lady',
        'Located near the Gerald Ford Amphitheater'
      ],
      position_lat: 39.6407,
      position_lng: -106.3876,
      address: '183 Gore Creek Dr, Vail, CO 81657'
    },
    {
      stop_id: 'stop_3',
      title: 'Sky High Adventure',
      description: 'The main gondola to the top of Vail Mountain',
      clue: 'Ascend in a cabin of glass and steel, where eagles soar and mountains reveal.',
      hints: [
        'It takes you to Mid-Vail and Eagle\'s Nest',
        'Located in the center of Vail Village',
        'Free scenic rides in summer'
      ],
      position_lat: 39.6421,
      position_lng: -106.3783,
      address: '600 W Lionshead Cir, Vail, CO 81657'
    },
    {
      stop_id: 'stop_4',
      title: 'Winter Sports History',
      description: 'Museum celebrating Colorado\'s ski heritage',
      clue: 'Where legends of snow and slope reside, find the hall where ski champions hide.',
      hints: [
        'It\'s in the Vail Village Transportation Center',
        'Features the Colorado Ski & Snowboard Hall of Fame',
        'Free admission'
      ],
      position_lat: 39.6430,
      position_lng: -106.3821,
      address: '231 S Frontage Rd E, Vail, CO 81657'
    },
    {
      stop_id: 'stop_5',
      title: 'The Western Gateway',
      description: 'Charming European-style village area',
      clue: 'Where the lion guards the mountain\'s west, find the village that rivals the rest.',
      hints: [
        'It\'s on the western side of Vail',
        'Has its own gondola access',
        'Features an ice skating rink in winter'
      ],
      position_lat: 39.6404,
      position_lng: -106.3980,
      address: 'Lionshead Village, Vail, CO 81657'
    }
  ];

  try {
    // Insert each stop into kv_store with appropriate key structure
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

    // Also create a stops index entry
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
      console.error('Error creating stops index:', indexError);
    } else {
      console.log('✅ Created stops index');
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
    }

  } catch (error) {
    console.error('Error populating stops:', error);
  }
}

// Run the script
populateStops().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});