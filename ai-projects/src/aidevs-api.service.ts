import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const baseaiDevsUrl = 'https://c3ntrala.ag3nts.org';

@Injectable()
export class AidevsApiService {
  constructor(private readonly configService: ConfigService) {}

  async getData(endpoint: string): Promise<string> {
    const baseUrl = `${baseaiDevsUrl}/dane/`;
    const response = await axios.get<string>(`${baseUrl}${endpoint}`);
    return response.data;
  }

  async postQuery<T>(endpoint: string, query: string): Promise<T> {
    const apikey = this.configService.get<string>('AI_DEVS_AI_KEY');
    const payload = {
      apikey,
      query: query,
    };
    try {
      const response = await axios.post<T>(
        `${baseaiDevsUrl}${endpoint}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data as T;
      }
      throw error;
    }
  }
}
