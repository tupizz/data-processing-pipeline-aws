import { faker } from '@faker-js/faker';
import fs from "fs";

function createJson() {
    const json = {
        "contacts": [
            {
                "first_name": "John",
                "last_name": "Doe",
                "company_domain": "john.doe@example.com"
            }
        ]
    }

    let limit = 10_000;
    for (let i = 0; i < limit; i++) {
        json.contacts.push({
            "first_name": faker.person.firstName(),
            "last_name": faker.person.lastName(),
            "company_domain": faker.internet.email(),
        });
    }

    return json;
}

function main() {
    const json = createJson();
    fs.writeFileSync("contacts.json", JSON.stringify(json, null, 2));
}

main();