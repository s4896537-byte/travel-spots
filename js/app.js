document.body.innerHTML = "<h1>成功上線🔥</h1>";
// js/app.js

// Importing Supabase client
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = 'https://your-supabase-url.supabase.co';
const supabaseKey = 'your-anon-public-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to fetch travel spots
async function fetchTravelSpots() {
    const { data, error } = await supabase
        .from('travel_spots')
        .select('*');

    if (error) console.error('Error fetching travel spots:', error);
    return data;
}

// Function to add a new travel spot
async function addTravelSpot(spot) {
    const { data, error } = await supabase
        .from('travel_spots')
        .insert([spot]);

    if (error) console.error('Error adding travel spot:', error);
    return data;
}

// Example usage
fetchTravelSpots().then(spots => console.log(spots));
// addTravelSpot({ name: 'New Destination', location: 'Country', description: 'Beautiful place!' });
