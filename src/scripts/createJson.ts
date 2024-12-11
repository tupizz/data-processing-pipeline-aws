import { faker } from '@faker-js/faker';
import fs from 'fs';
import path from 'path';

function createJson(numberOfContacts: number) {
  const json = {
    contacts: [
      {
        first_name: 'John',
        last_name: 'Doe',
        company_domain: 'john.doe@example.com',
      },
    ],
  };

  const limit = numberOfContacts * 1000;
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
  /**
   * total contacts: will be the number of contacts * 1000
   */
  const numberOfContacts = parseInt(process.argv[2] as string);
  const json = createJson(numberOfContacts);
  fs.writeFileSync(path.join(__dirname, `contacts_${numberOfContacts}k.json`), JSON.stringify(json, null, 2));
}

main();
