import 'reflect-metadata';

import { S3ServiceAdapter } from '@/lib/infra';
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

async function createEnrichment(file: string = 'contacts.json', pushToS3: boolean = false) {
  const url = `${BASE_URL}/enrichment`;

  const contacts = fs.readFileSync(path.join(__dirname, file), 'utf8');

  let s3Url = '';
  if (pushToS3) {
    const s3Adapter = new S3ServiceAdapter('storage-primer');
    await s3Adapter.uploadObject(`uploads/${file}`, contacts);
    s3Url = `https://storage-primer.s3.amazonaws.com/uploads/${file}`;
  }

  const data: EnrichmentRequest = {
    contacts: pushToS3 ? s3Url : JSON.parse(contacts).contacts,
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

createEnrichment(process.argv[2] as string, process.argv[3] === 'true');
