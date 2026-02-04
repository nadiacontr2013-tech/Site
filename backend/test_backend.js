const fs = require('fs');

async function test() {
    console.log('--- Testing Speed-Optimized Backend ---');

    console.log('\n1. Testing /api/email/send-email (Contact Form)...');
    try {
        const start = Date.now();
        const res1 = await fetch('http://localhost:5000/api/email/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Speed Test User',
                email: 'test@example.com',
                phone: '1234567890',
                message: 'Testing instant response speed',
                subject: 'Performance Test',
                company: 'SpeedCo',
                commercialRegisterNumber: '123456789'
            })
        });
        const duration = Date.now() - start;
        const data1 = await res1.json();
        console.log(`Response Time: ${duration}ms (Goal: <200ms)`);
        console.log('Response:', res1.status, data1);
    } catch (e) {
        console.error('Error:', e.message);
    }

    console.log('\n2. Testing /api/job/job (Career Form)...');
    try {
        // Create a dummy test file if it doesn't exist
        if (!fs.existsSync('test.pdf')) {
            fs.writeFileSync('test.pdf', 'dummy pdf content');
        }

        const formData = new FormData();
        formData.append('name', 'Speedy Applicant');
        formData.append('email', 'job@example.com');
        formData.append('phone', '0987654321');
        formData.append('position', 'Lead Developer');
        formData.append('experience', '10 years');
        formData.append('message', 'I am fast');
        formData.append('nationality', 'Saudi');
        formData.append('education', 'BSc Computer Science');

        const fileBuffer = fs.readFileSync('test.pdf');
        const blob = new Blob([fileBuffer], { type: 'application/pdf' });
        formData.append('resume', blob, 'test.pdf');

        const start = Date.now();
        const res2 = await fetch('http://localhost:5000/api/job/job', {
            method: 'POST',
            body: formData
        });
        const duration = Date.now() - start;
        const data2 = await res2.json();
        console.log(`Response Time: ${duration}ms (Goal: <500ms for multipart)`);
        console.log('Response:', res2.status, data2);
    } catch (e) {
        console.error('Error:', e);
    }

    console.log('\n--- Test Completed ---');
    console.log('Check server logs to verify background email delivery (takes ~5-10s).');
}

test();
