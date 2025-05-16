import { Injectable } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { task3Data } from './data/task3';
import { ConfigService } from '@nestjs/config';

export type Task3Response = {
  code: number;
  message: string;
};

@Injectable()
export class Task3Service {
  constructor(
    private openaiService: OpenaiService,
    private readonly configService: ConfigService,
  ) {}

  correctCalulcation(question: string): number {
    const [a, b] = question.split('+').map((num) => parseInt(num.trim(), 10));
    return a + b;
  }

  async answerTestQuestions() {
    const openai = this.openaiService.getInstance();
    // Deep copy to avoid mutating the original data
    const updatedData = {
      ...task3Data,
      'test-data': await Promise.all(
        task3Data['test-data'].map(
          async (item: {
            question: string;
            answer: number;
            test?: { q: string; a: string };
          }) => {
            let result;
            if (item?.test?.q) {
              // Use OpenAI to answer the question
              const response = await openai.chat.completions.create({
                model: 'gpt-4.1',
                messages: [
                  {
                    role: 'system',
                    content:
                      'Only write the answer to the following question, and nothing else.',
                  },
                  { role: 'user', content: item.test.q },
                ],
                max_tokens: 50,
              });
              const answer = response.choices[0].message.content?.trim() || '';

              result = {
                ...item,
                answer: this.correctCalulcation(item.question),
                test: {
                  ...item.test,
                  a: answer,
                },
              };
              console.dir(result, { depth: null, colors: true });
              return result;
            }
            result = {
              ...item,
              answer: this.correctCalulcation(item.question),
            };
            console.dir(result, { depth: null, colors: true });
            return result;
          },
        ),
      ),
    };
    return updatedData;
  }

  async reportModifiedData(modifiedData: object): Promise<Task3Response> {
    const apikey = this.configService.get<string>('AI_DEVS_AI_KEY');
    const axios = (await import('axios')).default;
    const payload = {
      task: 'JSON',
      apikey,
      answer: {
        ...modifiedData,
        apikey,
      },
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
    } catch (error: unknown) {
      console.error(error);
      throw new Error(
        `Report request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updateAndReportData(): Promise<Task3Response> {
    // First update the data
    const updatedData = await this.answerTestQuestions();

    // Then send the updated data
    const response = await this.reportModifiedData(updatedData);
    return response;
  }
}
