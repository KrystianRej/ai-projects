import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Task3Response } from './task3.service';
import axios from 'axios';

export type ReportInput = {
  task: string;
  answer: string | object;
};

@Injectable()
export class ReportService {
  constructor(private readonly configService: ConfigService) {}

  async reportAnswer(input: ReportInput): Promise<Task3Response> {
    const apikey = this.configService.get<string>('AI_DEVS_AI_KEY');
    const payload = {
      apikey,
      ...input,
    };
    console.dir(payload, { depth: null, colors: true });

    try {
      const response = await axios.post<{ code: number; message: string }>(
        'https://c3ntrala.ag3nts.org/report',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      return { ...response.data, answer: input.answer };
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        console.error('Error response:', error.response.data);
      }
      throw new Error('Report request failed');
    }
  }
}
