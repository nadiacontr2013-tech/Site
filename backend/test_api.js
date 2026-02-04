
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

async function testHealth() {
    console.log('\n--- Testing Health Check ---');
    try {
        const res = await fetch(`${BASE_URL}/health`);
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log('Response:', data);
    } catch (error) {
        console.error('Health Check Failed:', error.message);
    }
}

async function testSendEmail() {
    console.log('\n--- Testing Send Email (Contact Form) ---');
    try {
        const res = await fetch(`${BASE_URL}/api/email/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test User',
                email: 'test@example.com',
                message: 'This is a test message from automated testing.',
                subject: 'Test Subject',
                company: 'Test Co'
            })
        });
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log('Response:', data);
    } catch (error) {
        console.error('Send Email Failed:', error.message);
    }
}

async function testServiceRequest() {
    console.log('\n--- Testing Service Request ---');
    try {
        const res = await fetch(`${BASE_URL}/api/email/send-service-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientName: 'Test Client',
                commercialRegisterNumber: '1234567890',
                contactPerson: 'John Doe',
                email: 'client@example.com',
                phone: '1234567890',
                location: 'Riyadh',
                requiredJobs: [
                    { position: 'Engineer', count: 2, nationality: 'Any' }
                ]
            })
        });
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log('Response:', data);
    } catch (error) {
        console.error('Service Request Failed:', error.message);
    }
}

async function testJobApplication() {
    console.log('\n--- Testing Job Application (File Upload) ---');
    // Create a dummy PDF file
    const dummyPath = path.join(__dirname, 'dummy_resume.pdf');
    fs.writeFileSync(dummyPath, 'Dummy PDF Content');

    try {
        const formData = new FormData();
        formData.append('name', 'Job Applicant');
        formData.append('email', 'applicant@example.com');
        formData.append('phone', '0987654321');
        formData.append('position', 'Developer');
        formData.append('experience', '5 years');
        formData.append('message', 'Hire me!');

        const fileBlob = new Blob([fs.readFileSync(dummyPath)], { type: 'application/pdf' });
        formData.append('resume', fileBlob, 'dummy_resume.pdf');

        const res = await fetch(`${BASE_URL}/api/job/job`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log('Response:', data);

    } catch (error) {
        console.error('Job Application Failed:', error.message);
    } finally {
        if (fs.existsSync(dummyPath)) fs.unlinkSync(dummyPath);
    }
}

async function runTests() {
    await testHealth();
    await testSendEmail();
    await testServiceRequest();
    await testJobApplication();
}

runTests();
