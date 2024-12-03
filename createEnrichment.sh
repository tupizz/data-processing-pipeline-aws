curl -X POST https://n3ompsrfre.execute-api.us-east-1.amazonaws.com/enrichment \
-H "Content-Type: application/json" \
-d '{
  "contacts": [
    {
      "first_name": "John",
      "last_name": "Doe",
      "company_domain": "john.doe@example.com"
    },
    {
      "first_name": "Jane",
      "last_name": "Smith",
      "company_domain": "jane.smith@example.com"
    }
  ],
  "fields_to_enrich": ["professional_email", "personal_phone"]
}' | jq
