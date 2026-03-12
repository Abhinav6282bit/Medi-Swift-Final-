const notificationService = require('./utils/notificationService');

async function testNotification() {
    console.log('Starting Notification Service Test...');

    const mockData = {
        firstName: 'Abhinav',
        lastName: 'Test',
        mediId: 'MS-PATE-9999',
        email: 'akkuz628234@gmail.com',
        phone: '+916282348375',
        role: 'Patient'
    };

    console.log('Triggering Welcome Message...');
    await notificationService.sendWelcomeMessage(mockData);

    console.log('Test Finished. Check above for console logs.');
}

testNotification().catch(err => console.error('Test Failed:', err));
