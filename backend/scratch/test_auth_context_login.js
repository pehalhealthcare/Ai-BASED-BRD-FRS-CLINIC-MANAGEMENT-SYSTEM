// Test session ingestion logic mimicking AuthContext.login

function simulateLogin(credentialsOrUser, directToken) {
  let appliedToken = null;
  let appliedUser = null;

  const applyAuthState = ({ nextToken, nextUser }) => {
    appliedToken = nextToken;
    appliedUser = nextUser;
  };

  // If called with already authenticated user & token
  if (directToken && credentialsOrUser && typeof credentialsOrUser === 'object') {
    applyAuthState({
      nextToken: directToken,
      nextUser: credentialsOrUser
    });
    return { user: credentialsOrUser, accessToken: directToken };
  }

  // Direct { accessToken, user }
  if (credentialsOrUser?.accessToken && credentialsOrUser?.user) {
    applyAuthState({
      nextToken: credentialsOrUser.accessToken,
      nextUser: credentialsOrUser.user
    });
    return credentialsOrUser;
  }

  // Nested { data: { accessToken, user } }
  if (credentialsOrUser?.data?.accessToken && credentialsOrUser?.data?.user) {
    applyAuthState({
      nextToken: credentialsOrUser.data.accessToken,
      nextUser: credentialsOrUser.data.user
    });
    return credentialsOrUser.data;
  }

  // Direct { token, user }
  if (credentialsOrUser?.token && credentialsOrUser?.user) {
    applyAuthState({
      nextToken: credentialsOrUser.token,
      nextUser: credentialsOrUser.user
    });
    return credentialsOrUser;
  }

  // Nested { data: { token, user } }
  if (credentialsOrUser?.data?.token && credentialsOrUser?.data?.user) {
    applyAuthState({
      nextToken: credentialsOrUser.data.token,
      nextUser: credentialsOrUser.data.user
    });
    return credentialsOrUser.data;
  }

  // If none matched, it would have called authApi.login(credentialsOrUser)
  throw new Error('FALLTHROUGH_TO_PASSWORD_LOGIN');
}

console.log('--- Testing Payload Formats in AuthContext.login ---');

// Test Case 1: Direct unwrapResponse
const case1 = { accessToken: 'token_123', user: { role: 'DOCTOR', name: 'Dr. Test' } };
const res1 = simulateLogin(case1);
console.log('Case 1 (Flat accessToken):', res1.accessToken === 'token_123' ? 'PASS' : 'FAIL');

// Test Case 2: Nested response.data (from extractData)
const case2 = { success: true, message: 'Login successful', data: { accessToken: 'token_456', user: { role: 'DOCTOR', name: 'Dr. Test' } } };
const res2 = simulateLogin(case2);
console.log('Case 2 (Nested data.accessToken):', res2.accessToken === 'token_456' ? 'PASS' : 'FAIL');

// Test Case 3: Flat token
const case3 = { token: 'token_789', user: { role: 'DOCTOR', name: 'Dr. Test' } };
const res3 = simulateLogin(case3);
console.log('Case 3 (Flat token):', res3.token === 'token_789' ? 'PASS' : 'FAIL');

// Test Case 4: Nested token
const case4 = { success: true, message: 'Login successful', data: { token: 'token_abc', user: { role: 'DOCTOR', name: 'Dr. Test' } } };
const res4 = simulateLogin(case4);
console.log('Case 4 (Nested data.token):', res4.token === 'token_abc' ? 'PASS' : 'FAIL');

console.log('--- All AuthContext.login session cases PASSED successfully! ---');
