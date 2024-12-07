#!/bin/bash

curl -X POST https://z1yrl80omf.execute-api.us-east-1.amazonaws.com/enrichment \
-H "Content-Type: application/json" \
-d '{
  "contacts": [
    {
      "first_name": "John",
      "last_name": "Doe",
      "company_domain": "john.doe@example.com"
    },
    {
      "first_name": "Rubie",
      "last_name": "Kiehn",
      "company_domain": "Gregoria.Wyman@hotmail.com"
    }
  ],
  "fields_to_enrich": ["professional_email", "personal_phone"]
}' | jq
