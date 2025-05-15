import { Injectable } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { task2Promps } from './prompts/task2';

interface Message {
  text: string;
  msgID: number;
}

@Injectable()
export class Task2Service {
  constructor(private openaiService: OpenaiService) {}

  async learnAndAnswer(message: Message): Promise<Message> {
    const openai = this.openaiService.getInstance();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: task2Promps },
        { role: 'user', content: JSON.stringify(message) },
      ],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content as string) as Message;
  }

  async postToVerify(body: Message): Promise<Message> {
    const axios = (await import('axios')).default;
    try {
      const response = await axios.post<Message>(
        'https://xyz.ag3nts.org/verify',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error: unknown) {
      throw new Error(
        `Verification request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async performVerification(): Promise<Message> {
    // Call postToVerify with {text: 'READY', msgID: 0}
    const data = await this.postToVerify({ text: 'READY', msgID: 0 });

    console.dir(data, { depth: null, colors: true });

    // Pass the response to learnAndAnswer
    const answer = await this.learnAndAnswer(data);

    console.dir(answer, { depth: null, colors: true });

    const data2 = await this.postToVerify(answer);

    console.dir(data2, { depth: null, colors: true });

    return answer;
  }
}
