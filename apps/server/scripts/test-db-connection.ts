
import { createClient } from '@supabase/supabase-js';

// Read env vars
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Environment Variables!');
    console.error('Please run with:');
    console.error('$env:SUPABASE_URL="YOUR_URL"; $env:SUPABASE_SERVICE_KEY="YOUR_key"; npx ts-node apps/server/scripts/test-db-connection.ts');
    process.exit(1);
}

console.log('🔄 Connecting to Supabase...');
console.log(`URL: ${supabaseUrl}`);
// Mask key for safety
console.log(`Key: ${supabaseKey.substring(0, 10)}... (Service Role)`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('🔄 Attempting to write a test record...');

    const testId = '00000000-0000-0000-0000-000000000000'; // Dummy ID

    try {
        // 1. Try to Upsert (Insert or Update)
        const { error } = await supabase
            .from('player_stats')
            .upsert({
                id: testId,
                games_played: 1,
                games_won: 0,
                updated_at: new Date().toISOString()
            });

        if (error) {
            throw error;
        }

        console.log('✅ SUCCESS: Write operation successful!');
        console.log('✅ Your SERVICE_ROLE_KEY is working correctly.');

        // 2. Clean up (Delete the test record)
        console.log('🔄 Cleaning up test record...');
        await supabase.from('player_stats').delete().eq('id', testId);
        console.log('✅ Cleanup successful.');

    } catch (err: any) {
        console.error('❌ FAILED: Could not write to database.');
        console.error('Error details:', err.message);
        console.error('\nPOSSIBLE CAUSES:');
        console.error('1. You are using the ANON key instead of SERVICE_ROLE key.');
        console.error('2. Row Level Security policies are blocking the write.');
        console.error('3. The table "player_stats" does not exist.');
    }
}

testConnection();
