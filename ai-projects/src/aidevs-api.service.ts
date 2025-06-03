import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const baseaiDevsUrl = 'https://c3ntrala.ag3nts.org';

export type MySqlRequest = {
  task: string;
  apikey: string;
  query: string;
};

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

  async postWithApiKey<T, R>(endpoint: string, data: T): Promise<R> {
    const apikey = this.configService.get<string>('AI_DEVS_AI_KEY');
    const payload = {
      apikey,
      ...data,
    };
    try {
      const response = await axios.post<R>(
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
        return error.response.data as R;
      }
      throw error;
    }
  }

  private async postToUrl<T>(url: string, data: MySqlRequest): Promise<T> {
    try {
      const response = await axios.post<T>(url, data);
      return response.data;
    } catch (error) {
      console.error('Error posting to URL:', error);
      throw error;
    }
  }

  async postToMySqlRequest<T>(query: string): Promise<T> {
    const apikey = this.configService.get<string>('AI_DEVS_AI_KEY');
    if (!apikey) {
      throw Error('Missing ai_devs apiKey');
    }
    return this.postToUrl<T>(`${baseaiDevsUrl}/apidb`, {
      task: 'database',
      apikey,
      query,
    });
  }
}
