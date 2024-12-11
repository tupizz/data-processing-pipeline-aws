import axios from 'axios';

export const requestContacts = async (fileUrl: string) => {
  const response = await axios.get(fileUrl, { responseType: 'text' });
  return JSON.parse(response.data);
};
