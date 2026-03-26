const { getSession, updateSession, createEnquiry, updateEnquiry } = require('./src/bot/db');

async function testDatabase() {
  console.log('Testing database operations...');
  
  try {
    // Test 1: Create and update session
    console.log('\n1. Testing session creation...');
    await updateSession('1234567890', 'GREETING', { 
      test: 'initial data', 
      package: 'standard',
      event_name: 'Test Event'
    });
    
    let session = await getSession('1234567890');
    console.log('Session after creation:', session);
    
    // Test 2: Update session with more data
    console.log('\n2. Testing session update...');
    await updateSession('1234567890', 'SELECT_PACKAGE', { 
      ...session.data,
      guest_count: 50,
      new_field: 'test update'
    });
    
    session = await getSession('1234567890');
    console.log('Session after update:', session);
    
    // Test 3: Create enquiry
    console.log('\n3. Testing enquiry creation...');
    const enquiryId = await createEnquiry({
      phone: '1234567890',
      event_name: 'Test Wedding',
      occasion_type: 'Wedding',
      client_name: 'Test Client',
      client_phone: '9876543210',
      guest_count: 50,
      event_date: '2024-12-25',
      event_time_slot: 'Evening',
      package: 'premium',
      estimated_cost: 57000,
      venue_id: 'venue_1',
      venue_name: 'Grand Hall',
      menu_type: 'veg',
      menu_items: 'Paneer Tikka, Dal Makhani, Gulab Jamun',
      decoration_id: 'dec_1',
      decoration_name: 'Royal Theme',
      status: 'ENQUIRY'
    });
    
    console.log('Enquiry created with ID:', enquiryId);
    
    // Test 4: Update enquiry
    console.log('\n4. Testing enquiry update...');
    await updateEnquiry('1234567890', {
      installment_plan: '30_40_30',
      status: 'BOOKED',
      booking_id: 'BK123456'
    });
    
    console.log('\n✅ All database tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
  
  process.exit(0);
}

testDatabase();
