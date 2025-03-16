require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error('ALPHA_VANTAGE_API_KEY environment variable is not set');
}

async function testAPIs() {
    try {
        // Test Yahoo Finance API
        console.log('Testing Yahoo Finance API...');
        const yahooResponse = await axios.get(
            'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&period1=1707926400&period2=1708012800',
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }
        );
        console.log('Yahoo Finance Response:', JSON.stringify(yahooResponse.data, null, 2));

        // Test Alpha Vantage API
        console.log('\nTesting Alpha Vantage API...');
        const alphaResponse = await axios.get(
            `https://www.alphavantage.co/query?function=OVERVIEW&symbol=AAPL&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        console.log('Alpha Vantage Response:', JSON.stringify(alphaResponse.data, null, 2));

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        console.error('Status:', error.response?.status);
        console.error('Headers:', error.response?.headers);
    }
}

testAPIs(); 