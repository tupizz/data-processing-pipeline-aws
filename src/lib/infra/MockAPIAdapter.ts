import { injectable } from 'tsyringe';

export interface EnrichedContact {
  first_name: string;
  last_name: string;
  company_domain: string;
  professional_email: string;
  personal_phone: string;
}

export interface Contact {
  first_name: string;
  last_name: string;
  company_domain: string;
}

export interface IMockAPIAdapter {
  enrich(items: Contact[]): Promise<EnrichedContact[]>;
}

const DELAY = 800;

@injectable()
export class MockAPIAdapter implements IMockAPIAdapter {
  async enrich(items: Contact[]): Promise<EnrichedContact[]> {
    const result = items.map((item) => ({
      ...item,
      professional_email: 'test@test.com',
      personal_phone: '1234567890',
    }));

    await new Promise((resolve) => setTimeout(resolve, DELAY));

    return result;
  }
}
