const axios = require('axios');

async function testWorkflows() {
  console.log('=== TESTING EMAIL WORKFLOWS ===');
  
  // 1. Test Demo Booking Submission
  console.log('\n--- 1. Testing Book a Demo Endpoint ---');
  try {
    const demoPayload = {
      fullName: 'Dr. Priya Sharma',
      email: 'pehalhealthcare@gmail.com',
      phone: '9876543210',
      clinicName: 'Apollo Care Clinic',
      doctorsCount: '2-5 Doctors',
      selectedDate: 'Thu, Sep 24, 2026',
      selectedTime: '12:30 PM',
      topics: 'AI Consultation Assistant, Digital EMR, Smart Billing',
      agree: true
    };

    const demoRes = await axios.post('http://localhost:5001/api/v1/support/demo', demoPayload);
    console.log('Demo Booking Response:', demoRes.data);
    if (demoRes.data.success) {
      console.log('SUCCESS: Demo booking submitted and email processed! Ticket ID:', demoRes.data.ticketId);
    } else {
      console.error('FAILED:', demoRes.data);
    }
  } catch (err) {
    console.error('Demo booking test error:', err.response?.data || err.message);
  }

  // 2. Test Customer Support Submission
  console.log('\n--- 2. Testing Customer Support Endpoint ---');
  try {
    const supportPayload = {
      firstName: 'Rajesh',
      lastName: 'Verma',
      email: 'pehalhealthcare@gmail.com',
      phone: '9812345678',
      clinicName: 'City Health Diagnostic Centre',
      role: 'Clinic Admin',
      department: 'Technical Support',
      priority: 'High',
      subject: 'Assistance with Multi-Branch Inventory Sync',
      message: 'We are expanding to a 2nd branch and need support configuring real-time pharmacy inventory sync across both locations.',
      agree: true
    };

    const supportRes = await axios.post('http://localhost:5001/api/v1/support', supportPayload);
    console.log('Customer Support Response:', supportRes.data);
    if (supportRes.data.success) {
      console.log('SUCCESS: Customer support submitted and email processed! Ticket ID:', supportRes.data.ticketId);
    } else {
      console.error('FAILED:', supportRes.data);
    }
  } catch (err) {
    console.error('Support test error:', err.response?.data || err.message);
  }

  // 3. Test Validation Failures
  console.log('\n--- 3. Testing Validation Handling ---');
  try {
    await axios.post('http://localhost:5001/api/v1/support/demo', { fullName: '' });
    console.error('FAILED: Invalid demo booking should have failed validation!');
  } catch (err) {
    console.log('PASSED: Empty demo payload correctly rejected with status:', err.response?.status, err.response?.data);
  }

  try {
    await axios.post('http://localhost:5001/api/v1/support', { firstName: '' });
    console.error('FAILED: Invalid support ticket should have failed validation!');
  } catch (err) {
    console.log('PASSED: Empty support payload correctly rejected with status:', err.response?.status, err.response?.data);
  }
}

testWorkflows();
