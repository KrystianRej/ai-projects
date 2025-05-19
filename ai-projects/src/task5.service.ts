import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenaiService } from './openai.service';
import axios from 'axios';

export type Task3Response = {
  code: number;
  message: string;
};

@Injectable()
export class Task5Service {
  constructor(
    private readonly configService: ConfigService,
    private readonly openaiService: OpenaiService,
  ) {}

  async fetchCenzuraData(): Promise<string> {
    const apikey = this.configService.get<string>('AI_DEVS_AI_KEY');
    const url = `https://c3ntrala.ag3nts.org/data/${apikey}/cenzura.txt`;
    try {
      const response = await axios.get<string>(url, { responseType: 'text' });
      return response.data;
    } catch (error: unknown) {
      console.error(error);
      throw new Error(
        `Failed to fetch cenzura data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async censorSensitiveData(sentence: string): Promise<string> {
    const openai = this.openaiService.getInstance();

    const systemPrompt = `
You are a helpful assistant. Your task is to replace the following sensitive data in the user's sentence with the word "CENZURA":
1. Name and surname (e.g., "John Smith")
2. Age (e.g., "29 lat", "age 25", "aged 40", "he is 32 years old", "Ma 30 lat") - here censor only numbers
3. City (e.g., "Warsaw", "New York")
4. Street and house number (e.g., "Main St 12", "Baker Street 221B", "ul. Kwiatowa 5") - here censor only street name and house number
Leave the rest of the sentence unchanged. Only replace the sensitive data with "CENZURA".
Return only the censored sentence, nothing else.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: sentence },
      ],
      max_tokens: 200,
    });

    return response.choices[0].message.content?.trim() || '';
  }

  async reportAnswer(answer: string | object): Promise<Task3Response> {
    const apikey = this.configService.get<string>('AI_DEVS_AI_KEY');
    const axios = (await import('axios')).default;
    const payload = {
      task: 'CENZURA',
      apikey,
      answer,
    };

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
      return response.data;
    } catch (error: any) {
      const finalError =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(finalError);
      throw new Error(`Report request failed: ${finalError}`);
    }
  }

  async censorAndReport(): Promise<Task3Response> {
    const sentence = await this.fetchCenzuraData();

    console.dir(sentence, { depth: null, colors: true });

    // Step 1: Censor the sensitive data in the sentence
    const censored = await this.censorSensitiveData(sentence);

    console.dir(censored, { depth: null, colors: true });

    // Step 2: Report the censored answer
    const reportResult = await this.reportAnswer(censored);

    console.dir(reportResult, { depth: null, colors: true });

    return reportResult;
  }
}
