const axios = require('axios');

const run = async () => {
  try {
    // 1. Log in
    console.log('Logging in as super admin...');
    const loginRes = await axios.post('http://[::1]:5001/api/v1/auth/login', {
      email: 'admin@clinic.com',
      password: 'Admin@123'
    });

    const token = loginRes.data?.data?.token || loginRes.data?.token;
    if (!token) {
      console.error('Failed to get token:', loginRes.data);
      return;
    }
    console.log('Login successful! Token acquired.');

    // 2. Fetch parameters
    console.log('Fetching global parameters...');
    const paramsRes = await axios.get('http://[::1]:5001/api/v1/healthcare-catalog/parameters', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Parameters API result count:', paramsRes.data?.data?.total || paramsRes.data?.total);

    // 3. Fetch investigations
    console.log('Fetching global investigations...');
    const labsRes = await axios.get('http://[::1]:5001/api/v1/healthcare-catalog/labs', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Investigations API result count:', labsRes.data?.data?.total || labsRes.data?.total);

  } catch (err) {
    console.error('API request failed:', err.message, err.stack);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', err.response.data);
    }
  }
};

run();
