// /api/get-questionnaire-data.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  const { submission_id } = req.query;

  if (!submission_id) {
    return res.status(400).json({ error: 'Missing submission_id' });
  }

  try {
    // Fetch questionnaire data from Supabase
    const { data, error } = await supabase
      .from('questionnaire_submissions')
      .select('*')
      .eq('submission_id', submission_id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Return the questionnaire data
    res.status(200).json(data);

  } catch (error) {
    console.error('Error fetching questionnaire data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}