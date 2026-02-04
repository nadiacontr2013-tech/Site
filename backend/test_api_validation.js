
const BASE_URL = 'http://localhost:5000';

async function testMissingFields() {
    console.log('\n--- Testing Missing Fields (Contact Form) ---');
    try {
        const res = await fetch(`${BASE_URL}/api/email/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // name missing
                email: 'test@example.com',
                message: 'Test message'
            })
        });
        const data = await res.json();
        console.log(`Status: ${res.status} (Expected: 400)`);
        console.log('Response:', data);
    } catch (error) {
        console.error('Test Failed:', error.message);
    }
}

async function testInvalidEmail() {
    console.log('\n--- Testing Invalid Email ---');
    try {
        const res = await fetch(`${BASE_URL}/api/email/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test',
                email: 'invalid-email',
                message: 'Test message'
            })
        });
        const data = await res.json();
        console.log(`Status: ${res.status} (Expected: 400)`);
        console.log('Response:', data);
    } catch (error) {
        console.error('Test Failed:', error.message);
    }
}

async function testRateLimit() {
    console.log('\n--- Testing Rate Limit (Job Application) ---');
    // Send 5 requests to trigger rate limit (Max is 3)
    for (let i = 1; i <= 5; i++) {
        // We need to use multipart validation failure or happy path to trigger rate limit.
        // Even invalid requests might trigger rate limit if it's applying to IP before validation?
        // Usually middleware order matters. 
        // In job.route.js: router.post('/job', jobLimiter, upload.single('resume'), ...)
        // So Limiter is FIRST.
        // We can send empty body to be fast.

        // Note: Multer might complain first if we don't handle it? 
        // But jobLimiter is before upload.single.

        try {
            const res = await fetch(`${BASE_URL}/api/job/job`, {
                method: 'POST',
                // No body, just hitting the endpoint
            });
            console.log(`Request ${i}: Status ${res.status}`);
            if (res.status === 429) {
                console.log('✅ Rate limit hit!');
            }
        } catch (error) {
            console.error(`Request ${i} Failed:`, error.message);
        }
    }
}

async function runTests() {
    await testMissingFields();
    await testInvalidEmail();
    await testRateLimit();
}

runTests();
