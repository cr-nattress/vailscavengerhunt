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

async function updateAllLocations() {
  console.log('Updating kv_store with all 10 production locations...');

  // Complete production stops data
  const stops = [
    {
      stop_id: 'stop_1',
      title: 'Covered Bridge',
      description: 'Vail\'s signature pedestrian gateway linking the village over Gore Creek.',
      clue: 'The wooden crossing every skier knows',
      hints: [
        'Timber roof, creek below, cameras above.',
        'Step off the cobblestones and listen for water.',
        'Cross where the village funnels into a single span over the creek.'
      ],
      position_lat: 39.641524,
      position_lng: -106.373345,
      address: '227 Bridge St, Vail, CO 81657'
    },
    {
      stop_id: 'stop_2',
      title: 'Chair Lift',
      description: 'The base of Gondola One—Vail\'s central uphill ride from the Village.',
      clue: 'Where empty chairs hang high, waiting for riders.',
      hints: [
        'Find the bullwheel near the cobblestones.',
        'Listen for the soft hum above Mountain Plaza.',
        'Stand beneath the line that rises from the village toward Mid-Vail.'
      ],
      position_lat: 39.63925,
      position_lng: -106.37349,
      address: '122 E Meadow Dr, Vail, CO 81657 (Gondola Haus / base area)'
    },
    {
      stop_id: 'stop_3',
      title: 'The Gore Range',
      description: 'A classic village vantage to spot the Gore Range from the creekside walk.',
      clue: 'Find the Gore Range',
      hints: [
        'Look east.',
        'Mountain teeth line the horizon beyond the village roofs.',
        'Face the creekside promenade and sight past the bridge to the jagged skyline.'
      ],
      position_lat: 39.641748,
      position_lng: -106.375951,
      address: 'Gore Creek Promenade (near International Bridge), Vail, CO 81657'
    },
    {
      stop_id: 'stop_4',
      title: 'Public Art / Sculpture',
      description: 'Village public art near Solaris—part of Vail\'s Art in Public Places collection.',
      clue: 'Discover a piece of art',
      hints: [
        'Steel and bronze keep watch where shoppers roam.',
        'Find the big plaza west of the clock that glows at night.',
        'Stand by the parking structure next to Solaris and you\'re beside the art.'
      ],
      position_lat: 39.642554,
      position_lng: -106.375596,
      address: '141 E Meadow Dr, Vail, CO 81657 (Solaris Plaza / parking structure edge)'
    },
    {
      stop_id: 'stop_5',
      title: 'Water\'s Edge',
      description: 'Slifer Fountain at Slifer Square—bubbling centerpiece by Gore Creek.',
      clue: 'In the heart of the village, discover where water brings life and movement.',
      hints: [
        'Find the splash where kids point and parents rest.',
        'On the square by the museum and Welcome Center.',
        'Stand at the fountain beside the bridge and the circle that bears a founder\'s name.'
      ],
      position_lat: 39.64185,
      position_lng: -106.37336,
      address: 'Slifer Fountain, near 242 E Meadow Dr, Vail, CO 81657'
    },
    {
      stop_id: 'stop_6',
      title: 'Skier',
      description: '"Spirit of the Skier" statue near Golden Peak\'s base facilities.',
      clue: 'A permanent tribute to the sport',
      hints: [
        'Bronze edges cut the air near a learning hill.',
        'Skis carried with purpose by the base area buildings.',
        'Find the figure by Golden Peak, near the beginner lift.'
      ],
      position_lat: 39.63936,
      position_lng: -106.37063,
      address: 'Golden Peak area, near Ski & Snowboard School, Vail, CO 81657'
    },
    {
      stop_id: 'stop_7',
      title: 'Clock Tower',
      description: 'The signature Vail Village clock tower on Gore Creek Drive.',
      clue: 'A tower rises above the shops, keeping time at the center of it all.',
      hints: [
        'Chimes above cobblestones near the bridge.',
        'Shingles, balconies, and a face that never blinks.',
        'Stand at Gore Creek Drive where the tall alpine roof shows the hour.'
      ],
      position_lat: 39.6405,
      position_lng: -106.3742,
      address: '263 Gore Creek Dr, Vail, CO 81657'
    },
    {
      stop_id: 'stop_8',
      title: 'Berkshire Hathaway Office',
      description: 'Berkshire Hathaway HomeServices Colorado Properties office in the Village core.',
      clue: 'Where mountain life meets real estate — but only in Vail Village, not Lionshead.',
      hints: [
        'Find the second-floor brokers above a cozy coffee bar.',
        'Steps from the creek and the bridge with flags.',
        'Look for Suite 200 on the lane west of Bridge Street.'
      ],
      position_lat: 39.640566,
      position_lng: -106.374208,
      address: '225 Wall St, Ste 200, Vail, CO 81657'
    },
    {
      stop_id: 'stop_9',
      title: 'On the Bus',
      description: 'Vail Village Transportation Center—hub for the free in-town bus.',
      clue: 'Climb aboard Vail\'s free ride',
      hints: [
        'Find the big glass-and-concrete hub facing the frontage road.',
        'Listen for air brakes and route calls by the Welcome Center.',
        'Go to the main station where every Village route meets.'
      ],
      position_lat: 39.64232,
      position_lng: -106.37362,
      address: '241 S Frontage Rd E, Vail, CO 81657'
    },
    {
      stop_id: 'stop_10',
      title: 'Four-Legged Friends',
      description: 'Dog- and family-friendly hangout by the Children\'s Fountain on Gore Creek Drive.',
      clue: 'Vail is full of four-legged friends — find one and learn its name.',
      hints: [
        'Look where families gather between two classic restaurants.',
        'Creekside splashes and giggles echo off the stone.',
        'Stand at the children\'s fountain on Gore Creek Drive and you\'ll meet plenty.'
      ],
      position_lat: 39.641092,
      position_lng: -106.374254,
      address: 'Gore Creek Dr (Children\'s Fountain area), Vail, CO 81657'
    }
  ];

  try {
    // First, delete ALL existing stops for this hunt
    console.log('Clearing all existing stops...');
    const { error: deleteError } = await supabase
      .from('kv_store')
      .delete()
      .like('key', 'bhhs/fall-2025/stops/%');

    if (deleteError) {
      console.error('Error deleting old stops:', deleteError);
    } else {
      console.log('✅ Cleared all existing stops');
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

    // Update stops index with all 10 stops
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
      console.log('✅ Updated stops index with 10 locations');
    }

    // Verify the data
    console.log('\nVerifying data...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('kv_store')
      .select('*')
      .like('key', 'bhhs/fall-2025/stops/%')
      .not('key', 'like', '%/index');

    if (verifyError) {
      console.error('Error verifying data:', verifyError);
    } else {
      console.log(`✅ Found ${verifyData.length} stop entries in kv_store`);

      // Show all the titles to confirm
      const stopTitles = verifyData
        .map(item => item.value?.title)
        .filter(Boolean);
      console.log('All stop titles:', stopTitles);
    }

  } catch (error) {
    console.error('Error updating stops:', error);
  }
}

// Run the script
updateAllLocations().then(() => {
  console.log('Done! All 10 production locations have been updated.');
  process.exit(0);
}).catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});