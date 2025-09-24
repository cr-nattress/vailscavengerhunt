/**
 * Data Migration Script - TypeScript Files to Supabase
 * Migrates existing hunt data from TypeScript files to the new configurable Supabase system
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Hunt data from TypeScript files
const huntData = {
  // BHHS Hunt Data
  bhhs: {
    organizationId: 'bhhs',
    organizationName: 'Berkshire Hathaway HomeServices',
    hunts: {
      'fall-2025': {
        huntId: 'fall-2025',
        name: 'Fall 2025',
        orderingStrategy: 'fixed', // BHHS uses fixed order
        stops: [
          {
            stopId: 'covered-bridge',
            title: 'Covered Bridge',
            clue: 'The wooden crossing every skier knows',
            hints: [
              'The most iconic photo spot in Vail.',
              "It's the gateway into the village."
            ],
            defaultOrder: 1
          },
          {
            stopId: 'chair-lift',
            title: 'Chair Lift',
            clue: 'Where empty chairs hang high, waiting for riders',
            hints: [
              'Look up toward the slopes.',
              'They line the mountain skyline.'
            ],
            defaultOrder: 2
          },
          {
            stopId: 'gore-range',
            title: 'The Gore Range',
            clue: 'Find the Gore Range',
            hints: [
              'Look east.',
              "You can see it from Jill's favorite store."
            ],
            defaultOrder: 3
          },
          {
            stopId: 'public-art',
            title: 'Public Art / Sculpture',
            clue: 'Discover a piece of art',
            hints: [
              'Look near plazas or gathering spots.',
              'Bronze, stone, or abstract — it stands out.'
            ],
            defaultOrder: 4
          },
          {
            stopId: 'waters-edge',
            title: "Water's Edge",
            clue: 'In the heart of the village, discover where water brings life and movement.',
            hints: [
              'Listen for rushing water.',
              'A stream runs right through the village.'
            ],
            defaultOrder: 5
          },
          {
            stopId: 'skier',
            title: 'Skier',
            clue: 'Find a skier carrying their skis or mid-run.',
            hints: [
              'Statues and murals often celebrate skiing.',
              'Look for bronze near the main walkways.'
            ],
            defaultOrder: 6
          },
          {
            stopId: 'clock-tower',
            title: 'Clock Tower',
            clue: 'A tower rises above the shops, keeping time at the center of it all.',
            hints: [
              "It's visible from Bridge Street.",
              'The clock face is hard to miss.'
            ],
            defaultOrder: 7
          },
          {
            stopId: 'bhhs-vail-office',
            title: 'Berkshire Hathaway Office',
            clue: 'Where mountain life meets real estate — but only in Vail Village, not Lionshead.',
            hints: [
              'The Berkshire Hathaway Vail Office.',
              'Look for the sign near shops, not slopes.'
            ],
            defaultOrder: 8
          },
          {
            stopId: 'on-the-bus',
            title: 'On the Bus',
            clue: "Climb aboard Vail's free ride",
            hints: [
              'Look for the big blue buses.',
              'The stops are marked with bus icons.'
            ],
            defaultOrder: 9
          },
          {
            stopId: 'four-legged-friends',
            title: 'Four-Legged Friends',
            clue: 'Vail is full of four-legged friends — find one and learn its name.',
            hints: [
              'Check near shops and patios where dogs relax.',
              'Look for water bowls outside storefronts.'
            ],
            defaultOrder: 10
          }
        ],
        teams: [
          { teamId: 'berrypicker', displayName: 'Berrypicker' },
          { teamId: 'poppyfieldswest', displayName: 'Poppyfields West' },
          { teamId: 'teacup', displayName: 'Tea Cup' },
          { teamId: 'simba', displayName: 'Simba' },
          { teamId: 'whippersnapper', displayName: 'Whippersnapper' },
          { teamId: 'minniesmile', displayName: "Minnie's Mile" },
          { teamId: 'bornfree', displayName: 'Born Free' },
          { teamId: 'lookma', displayName: 'Look Ma' },
          { teamId: 'loversleap', displayName: "Lover's Leap" },
          { teamId: 'forever', displayName: 'Forever' }
        ]
      }
    }
  },

  // Vail Valley Hunt Data
  vail: {
    organizationId: 'vail',
    organizationName: 'Vail Valley',
    hunts: {
      'valley-default': {
        huntId: 'valley-default',
        name: 'Valley Default',
        orderingStrategy: 'fixed',
        stops: [
          {
            stopId: 'covered-bridge-valley',
            title: 'Covered Bridge',
            clue: 'Begin where timber frames something precious flowing beneath',
            hints: [
              'Begin where timber frames something precious flowing beneath.',
              'Lovers pause under wooden shelter as water rushes below.',
              'The iconic covered bridge spans Gore Creek in Vail Village.'
            ],
            defaultOrder: 1
          },
          {
            stopId: 'betty-ford-gardens',
            title: 'Betty Ford Alpine Gardens',
            clue: 'Seek the highest place where wildflowers dance in mountain air',
            hints: [
              'Seek the highest place where wildflowers dance in mountain air.',
              "A former First Lady's name graces this botanical sanctuary.",
              "North America's highest botanical garden blooms at 8,200 feet."
            ],
            defaultOrder: 2
          },
          {
            stopId: 'gondola-one',
            title: 'Gondola One (Eagle Bahn)',
            clue: 'Rise above the village where hearts take flight',
            hints: [
              'Rise above the village where hearts take flight.',
              'Soar like eagles in suspended chambers above the trees.',
              'The Eagle Bahn Gondola lifts you from Lionshead Village.'
            ],
            defaultOrder: 3
          },
          {
            stopId: 'international-bridge-valley',
            title: 'International Bridge',
            clue: 'Where many nations unite in colorful display above flowing water',
            hints: [
              'Where many nations unite in colorful display above flowing water.',
              'Flags of the world flutter as you cross from one side to another.',
              'The International Bridge spans Gore Creek with flags from every continent.'
            ],
            defaultOrder: 4
          },
          {
            stopId: 'vail-chapel',
            title: 'Vail Interfaith Chapel',
            clue: 'Find peace where all faiths gather by rushing waters',
            hints: [
              'Find peace where all faiths gather by rushing waters.'
            ],
            defaultOrder: 5
          }
        ]
      },
      'village-default': {
        huntId: 'village-default',
        name: 'Village Default',
        orderingStrategy: 'randomized', // Village uses randomized order
        stops: [
          {
            stopId: 'international-bridge-village',
            title: 'International Bridge',
            clue: 'Right next to the covered bridge, but this one is wide open to the sky',
            hints: [
              'Right next to the covered bridge, but this one is wide open to the sky.',
              'It crosses Gore Creek where concerts and festivals often spill into the streets.',
              "Look for the stone bridge lined with flags — you can't miss it."
            ],
            defaultOrder: 1
          },
          {
            stopId: 'yama-sushi',
            title: 'Yama Sushi',
            clue: 'Across from The Remedy Bar, this spot trades hot toddies for sake',
            hints: [
              'Across from The Remedy Bar, this spot trades hot toddies for sake.',
              'Small, modern, and often packed with locals after the slopes.',
              'The Japanese restaurant near Solaris known for creative rolls and late-night vibes.'
            ],
            defaultOrder: 2
          },
          {
            stopId: 'lodge-at-vail',
            title: 'Lodge at Vail',
            clue: 'Just steps from Gondola One, across from the pirate ship playground',
            hints: [
              'Just steps from Gondola One, across from the pirate ship playground.',
              "One of Vail's original hotels, full of wood beams and alpine charm.",
              'The classic mountain lodge where après ski feels timeless.'
            ],
            defaultOrder: 3
          },
          {
            stopId: 'patagonia',
            title: 'Patagonia',
            clue: 'Near Mountain Standard and Sweet Basil, but it sells jackets instead of food',
            hints: [
              'Near Mountain Standard and Sweet Basil, but it sells jackets instead of food.',
              'A favorite shop for climbers and skiers looking for gear with a purpose.'
            ],
            defaultOrder: 4
          }
        ]
      }
    }
  }
};

async function migrateData() {
  console.log('🚀 Starting data migration from TypeScript files to Supabase...\n');

  // Validate environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Error: Missing required environment variables');
    console.error('   - VITE_SUPABASE_URL: Supabase project URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin operations');
    process.exit(1);
  }

  try {
    // Create Supabase client with service role key
    console.log('🔗 Connecting to Supabase with admin privileges...');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let totalStops = 0;
    let totalConfigurations = 0;
    let totalTeams = 0;

    // Process each organization
    for (const [orgKey, orgData] of Object.entries(huntData)) {
      console.log(`\n📋 Processing organization: ${orgData.organizationName}`);

      // Ensure organization exists (should already be there from sample data)
      const { error: orgError } = await supabase
        .from('organizations')
        .upsert({
          id: orgData.organizationId,
          name: orgData.organizationName
        });

      if (orgError) {
        console.error(`❌ Error upserting organization ${orgData.organizationId}:`, orgError);
        continue;
      }

      // Process each hunt in the organization
      for (const [huntKey, huntData] of Object.entries(orgData.hunts)) {
        console.log(`  🎯 Processing hunt: ${huntData.name}`);

        // Ensure hunt exists
        const { error: huntError } = await supabase
          .from('hunts')
          .upsert({
            id: huntData.huntId,
            organization_id: orgData.organizationId,
            name: huntData.name,
            is_active: true
          });

        if (huntError) {
          console.error(`❌ Error upserting hunt ${huntData.huntId}:`, huntError);
          continue;
        }

        // Insert hunt ordering configuration
        const { error: orderingError } = await supabase
          .from('hunt_ordering_config')
          .upsert({
            organization_id: orgData.organizationId,
            hunt_id: huntData.huntId,
            ordering_strategy: huntData.orderingStrategy,
            seed_strategy: 'team_based'
          });

        if (orderingError) {
          console.error(`❌ Error setting hunt ordering:`, orderingError);
        } else {
          console.log(`    ⚙️  Ordering strategy: ${huntData.orderingStrategy}`);
        }

        // Process stops for this hunt
        for (const stop of huntData.stops) {
          // Insert stop into hunt_stops table
          const { error: stopError } = await supabase
            .from('hunt_stops')
            .upsert({
              stop_id: stop.stopId,
              title: stop.title,
              clue: stop.clue,
              hints: stop.hints
            });

          if (stopError && stopError.code !== '23505') { // Ignore duplicate key errors
            console.error(`❌ Error inserting stop ${stop.stopId}:`, stopError);
            continue;
          }

          // Insert hunt configuration
          const { error: configError } = await supabase
            .from('hunt_configurations')
            .upsert({
              organization_id: orgData.organizationId,
              hunt_id: huntData.huntId,
              stop_id: stop.stopId,
              default_order: stop.defaultOrder,
              is_active: true
            });

          if (configError) {
            console.error(`❌ Error inserting hunt configuration:`, configError);
          } else {
            totalStops++;
            totalConfigurations++;
            console.log(`    ✅ Stop: ${stop.title} (order: ${stop.defaultOrder})`);
          }
        }

        // Process teams for this hunt (if any)
        if (huntData.teams) {
          for (const team of huntData.teams) {
            // Insert team
            const { data: teamData, error: teamError } = await supabase
              .from('teams')
              .upsert({
                team_id: team.teamId,
                organization_id: orgData.organizationId,
                hunt_id: huntData.huntId,
                name: team.teamId,
                display_name: team.displayName,
                score: 0
              })
              .select('id')
              .single();

            if (teamError) {
              console.error(`❌ Error inserting team ${team.teamId}:`, teamError);
              continue;
            }

            // Initialize team for hunt (creates progress entries and randomized order if needed)
            const { error: initError } = await supabase.rpc('initialize_team_for_hunt', {
              p_team_id: teamData.id,
              p_organization_id: orgData.organizationId,
              p_hunt_id: huntData.huntId
            });

            if (initError) {
              console.error(`❌ Error initializing team ${team.teamId}:`, initError);
            } else {
              totalTeams++;
              console.log(`    👥 Team: ${team.displayName}`);
            }
          }
        }
      }
    }

    // Generate team codes for BHHS teams (using existing pattern)
    console.log(`\n🎫 Generating team codes for BHHS teams...`);
    const teamCodes = [
      { code: 'ALPHA01', teamName: 'Berrypicker' },
      { code: 'BETA02', teamName: 'Poppyfields West' },
      { code: 'GAMMA03', teamName: 'Tea Cup' },
      { code: 'DELTA04', teamName: 'Simba' },
      { code: 'ECHO05', teamName: 'Whippersnapper' },
      { code: 'FOXTROT06', teamName: "Minnie's Mile" },
      { code: 'GOLF07', teamName: 'Born Free' },
      { code: 'HOTEL08', teamName: 'Look Ma' },
      { code: 'INDIA09', teamName: "Lover's Leap" },
      { code: 'JULIET10', teamName: 'Forever' }
    ];

    for (const teamCode of teamCodes) {
      // Find the team by display name
      const { data: team } = await supabase
        .from('teams')
        .select('id')
        .eq('organization_id', 'bhhs')
        .eq('hunt_id', 'fall-2025')
        .eq('display_name', teamCode.teamName)
        .single();

      if (team) {
        const { error: codeError } = await supabase
          .from('team_codes')
          .upsert({
            code: teamCode.code,
            team_id: team.id,
            organization_id: 'bhhs',
            hunt_id: 'fall-2025',
            is_active: true
          });

        if (codeError) {
          console.error(`❌ Error creating team code ${teamCode.code}:`, codeError);
        } else {
          console.log(`  ✅ Code: ${teamCode.code} → ${teamCode.teamName}`);
        }
      }
    }

    console.log('\n🎉 Data migration completed successfully!');
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Hunt stops created/updated: ${totalStops}`);
    console.log(`   ✅ Hunt configurations created: ${totalConfigurations}`);
    console.log(`   ✅ Teams initialized: ${totalTeams}`);
    console.log(`   ✅ Team codes generated: ${teamCodes.length}`);

    console.log('\n🎯 What was migrated:');
    console.log('   • BHHS Fall 2025 hunt (10 stops, fixed order, 10 teams)');
    console.log('   • Vail Valley Default hunt (5 stops, fixed order)');
    console.log('   • Vail Village Default hunt (4 stops, randomized order)');
    console.log('   • All existing clues, hints, and team data');
    console.log('   • Team codes for BHHS teams (ALPHA01-JULIET10)');

    console.log('\n📝 Next steps:');
    console.log('   1. Test the hunt system with existing team codes');
    console.log('   2. Verify randomized ordering for Vail Village teams');
    console.log('   3. Update the frontend to use new Supabase data');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Export for use in other scripts
export { migrateData };

// Run migration if this script is executed directly
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  migrateData().catch(console.error);
}