// Test script to check if module_feedback table exists and create it if needed
import { supabase } from '../src/lib/supabaseClient.js';

async function testFeedbackTable() {
  console.log('Testing module_feedback table...');
  
  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('module_feedback')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error('Table does not exist or has an error:', error);
      console.log('Please run the SQL script: database/module_feedback_table.sql in your Supabase dashboard');
      return false;
    }
    
    console.log('✅ module_feedback table exists!');
    return true;
  } catch (err) {
    console.error('Error testing table:', err);
    return false;
  }
}

testFeedbackTable();