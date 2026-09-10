const path = require('path');
const fs = require('fs');
const { generateOtpEmail, BRAND, getLogoAttachment } = require('../src/common/utils/emailTemplate');

console.log('═══════════════════════════════════════════════════════════');
console.log(' TESTING BRANDED OTP EMAIL TEMPLATES & LOGO ATTACHMENT    ');
console.log('═══════════════════════════════════════════════════════════\n');

// 1. Check Brand Object
console.log('1. Centralized Brand Constants:');
console.log('   Company:    ', BRAND.company);
console.log('   Product:    ', BRAND.product);
console.log('   Description:', BRAND.description);

if (BRAND.company !== 'PEPAL Healthcare' || BRAND.product !== 'AI-CMS Enterprise') {
  throw new Error('Brand hierarchy does not match official specification!');
}
console.log('   ✓ Brand constants verified.\n');

// 2. Check Logo Asset Resolution
console.log('2. Logo Attachment Check:');
const logoAttachment = getLogoAttachment();
console.log('   Logo Attachment:', logoAttachment);
if (!logoAttachment || !fs.existsSync(logoAttachment.path)) {
  throw new Error('Logo asset path cannot be found or does not exist on disk!');
}
if (logoAttachment.cid !== 'pepal-logo') {
  throw new Error('Logo CID must be "pepal-logo" for email embedding!');
}
console.log('   ✓ Logo asset verified at: ' + logoAttachment.path + '\n');

// 3. Test Email Generation for each portal/role
const testCases = [
  { role: 'ADMIN', portal: 'clinic', expectedPortal: 'Clinic Admin Portal', expectedContext: 'AI-CMS Enterprise Clinic Admin Portal' },
  { role: 'DOCTOR', portal: 'staff', expectedPortal: 'Doctor & Staff Portal', expectedContext: 'AI-CMS Enterprise Doctor & Staff Portal' },
  { role: 'RECEPTIONIST', portal: 'staff', expectedPortal: 'Doctor & Staff Portal', expectedContext: 'AI-CMS Enterprise Doctor & Staff Portal' },
  { role: 'PATIENT', portal: 'patient', expectedPortal: 'Patient Portal', expectedContext: 'AI-CMS Enterprise Patient Portal' }
];

testCases.forEach(({ role, portal, expectedPortal, expectedContext }, index) => {
  console.log(`3.${index + 1}. Testing Template for ${role} (${portal}):`);
  const email = generateOtpEmail({
    otp: '752946',
    portal,
    userRole: role,
    expiresInMinutes: 5
  });

  // Verify Subject
  if (email.subject !== 'Your AI-CMS Enterprise Login OTP') {
    throw new Error(`Invalid subject: ${email.subject}`);
  }

  // Verify Plain Text
  if (!email.text.includes(expectedContext)) {
    throw new Error(`Plain text missing context: ${expectedContext}`);
  }
  if (!email.text.includes('752946')) {
    throw new Error('Plain text missing OTP code');
  }
  if (!email.text.includes('⏱ This code expires in 5 minutes.')) {
    throw new Error('Plain text missing expiry note');
  }
  if (!email.text.includes('PEPAL Healthcare') || !email.text.includes('AI-CMS Enterprise')) {
    throw new Error('Plain text missing brand hierarchy');
  }

  // Verify HTML
  if (!email.html.includes(expectedPortal)) {
    throw new Error(`HTML missing portal title: ${expectedPortal}`);
  }
  if (!email.html.includes(expectedContext)) {
    throw new Error(`HTML missing portal context: ${expectedContext}`);
  }
  if (!email.html.includes('752946')) {
    throw new Error('HTML missing OTP code');
  }
  if (!email.html.includes('cid:pepal-logo')) {
    throw new Error('HTML missing cid:pepal-logo img src');
  }
  if (!email.html.includes('PEPAL Healthcare') || !email.html.includes('AI-CMS Enterprise')) {
    throw new Error('HTML missing brand hierarchy');
  }
  if (email.html.includes('PEPAL AI-CMS')) {
    throw new Error('HTML contains forbidden unapproved string "PEPAL AI-CMS"');
  }

  // Verify Attachments
  if (!email.attachments || email.attachments.length === 0 || email.attachments[0].cid !== 'pepal-logo') {
    throw new Error('Attachments missing logo CID item');
  }

  console.log(`   ✓ Template for ${role} (${portal}) is fully verified.`);
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log(' ALL BRANDING & EMAIL TEMPLATE TESTS PASSED PERFECTLY!    ');
console.log('═══════════════════════════════════════════════════════════\n');
