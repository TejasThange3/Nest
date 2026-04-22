// Test SMS functionality with Indian phone number
require('dotenv').config();
const twilio = require('twilio');

const INDIAN_TEST_NUMBER = '+919970593046'; // Your verified Indian number
const TEST_MESSAGE = 'Your Nest Video Calling verification code is: 123456';

async function testSMS() {
  console.log('🧪 Testing SMS functionality...\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing'}`);
  console.log(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log(`TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER || '❌ Missing'}\n`);
  
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log('❌ Twilio credentials missing. Please check your .env file');
    return;
  }
  
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    console.log('📱 Testing SMS to Indian number...');
    console.log(`📞 From: ${process.env.TWILIO_PHONE_NUMBER}`);
    console.log(`📞 To: ${INDIAN_TEST_NUMBER}`);
    console.log(`💬 Message: ${TEST_MESSAGE}\n`);
    
    const message = await client.messages.create({
      body: TEST_MESSAGE,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: INDIAN_TEST_NUMBER
    });
    
    console.log('✅ SMS sent successfully!');
    console.log(`📋 Message SID: ${message.sid}`);
    console.log(`📊 Status: ${message.status}`);
    console.log(`💰 Cost: $${message.price || 'Pending'} ${message.priceUnit || ''}`);
    console.log(`🌍 Direction: ${message.direction}`);
    console.log(`📅 Date Created: ${message.dateCreated}`);
    
  } catch (error) {
    console.error('❌ SMS Test Failed:');
    console.error(`Code: ${error.code}`);
    console.error(`Message: ${error.message}`);
    
    if (error.code === 21211) {
      console.log('\n💡 Tip: Make sure the phone number is in international format (+919876543210)');
    } else if (error.code === 21408) {
      console.log('\n💡 Tip: The phone number might not be able to receive SMS or is invalid');
    }
  }
}

// Note: Replace +919876543210 with your actual Indian phone number for testing
console.log('⚠️  IMPORTANT: Replace +919876543210 with your actual Indian phone number in the code before testing');
console.log('⚠️  This will send a real SMS and cost money (~$0.05-0.10)\n');

testSMS();
