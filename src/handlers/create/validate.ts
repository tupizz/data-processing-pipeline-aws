import { z } from 'zod';

export const contactSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  company_domain: z.string().min(1, 'Company domain is required'),
});

export const contactsArraySchema = z.array(contactSchema).min(1, 'At least one contact must be provided');

export const contactsUrlSchema = z.string().url('Contacts must be a valid URL').includes('s3.amazonaws.com');

export const enrichmentSchema = z.object({
  contacts: z.union([contactsArraySchema, contactsUrlSchema]),
  fields_to_enrich: z.array(z.string().min(1)).min(1, 'At least one field to enrich must be specified'),
});

export const validateEnrichmentInput = (input: unknown) => enrichmentSchema.parse(input);
