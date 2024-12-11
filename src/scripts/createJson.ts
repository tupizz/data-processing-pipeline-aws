import { faker } from '@faker-js/faker';
import fs from 'fs';
import path from 'path';

function createJson() {
  const json = {
    contacts: [
      {
        first_name: 'John',
        last_name: 'Doe',
        company_domain: 'john.doe@example.com',
      },
    ],
  };

  const limit = 50_000;
  for (let i = 0; i < limit; i++) {
    json.contacts.push({
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      company_domain: faker.internet.domainName(),
    });
  }

  return json;
}

function main() {
  const json = createJson();
  fs.writeFileSync(path.join(__dirname, 'contacts.json'), JSON.stringify(json, null, 2));
}

main();
