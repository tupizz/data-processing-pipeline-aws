import axios from 'axios';
import fs from 'fs';
import path from 'path';

interface Contact {
  first_name: string;
  last_name: string;
  company_domain: string;
}

interface EnrichmentRequest {
  contacts: Contact[];
  fields_to_enrich: string[];
}

const BASE_URL = 'https://z1yrl80omf.execute-api.us-east-1.amazonaws.com';

async function createEnrichment() {
  const url = `${BASE_URL}/enrichment`;

  const contacts = fs.readFileSync(path.join(__dirname, 'contacts.json'), 'utf8');

  const data: EnrichmentRequest = {
    contacts: JSON.parse(contacts).contacts,
    fields_to_enrich: ['professional_email', 'personal_phone'],
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error:', error.response?.data || error.message);
    } else {
      console.error('Error:', error);
    }
  }
}

createEnrichment();
