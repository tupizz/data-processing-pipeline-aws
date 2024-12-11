import 'reflect-metadata';

import { requestContacts } from '@/lib/utils/requestContacts';

// async function createEnrichment(file: string = 'contacts.json') {
//   const contacts = fs.readFileSync(path.join(__dirname, file), 'utf8');

//   let s3Url = '';

//   const s3Adapter = new S3ServiceAdapter('storage-primer');
//   await s3Adapter.uploadObject(`uploads/${file}`, contacts);
//   s3Url = `https://storage-primer.s3.amazonaws.com/uploads/${file}`;

//   const uploadedContacts = await requestContacts(s3Url);
//   console.log(uploadedContacts);
// }

async function run() {
  const s3Url = `https://storage-primer.s3.amazonaws.com/uploads/contacts_100k.json`;

  const uploadedContacts = await requestContacts(s3Url);
  console.log(Object.keys(uploadedContacts.contacts));
}

run();

// createEnrichment('contacts_50k.json');
