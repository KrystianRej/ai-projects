import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { OpenaiService } from './openai.service';
@Injectable()
export class AppService {
  constructor(private readonly openaiService: OpenaiService) {}

  async submitAnswerAndLogPage(answer: string): Promise<string> {
    try {
      const postResponse = await axios.post<string>(
        'https://xyz.ag3nts.org/',
        `username=tester&password=574e112a&answer=${answer}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const html = postResponse.data;

      console.dir({ html }, { depth: null, colors: true });

      return html;

      // const getResponse = await axios.get(url);
      // console.log(getResponse.data);
    } catch (error) {
      console.error('Error in submitAnswerAndLogPage:', error);
      throw error;
    }
  }

  async getHumanQuestion(): Promise<string> {
    const response = await axios.get<string>('https://xyz.ag3nts.org/');
    const html = response.data;

    // Extract the question from the HTML
    // The question is inside: <p id="human-question">Question:<br />...</p>
    const match = html.match(
      /<p id="human-question">Question:<br\s*\/?>(.*?)<\/p>/i,
    );

    if (match && match[1]) {
      // Remove any HTML tags and trim whitespace
      const question = match[1].replace(/<[^>]*>/g, '').trim();
      return question;
    }
    return '';
  }

  async answerQuestion(question: string): Promise<string> {
    const openai = this.openaiService.getInstance();

    // Add an instruction to only write the answer, nothing else
    const prompt = `Only write the answer to the following question, and nothing else - answer should be number:\n\n${question}`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 256,
      temperature: 0.7,
    });

    console.dir({ completion }, { depth: null, colors: true });

    const answer = completion?.choices[0]?.message?.content?.trim() ?? '';

    return answer;
  }

  async getAndAnswerAndPost(): Promise<string> {
    try {
      // Step 1: Get the human question
      const question = await this.getHumanQuestion();
      if (!question) {
        console.error('No question found to answer.');
        return 'No question found to answer.';
      }

      // Step 2: Answer the question
      const answer = await this.answerQuestion(question);

      // Step 3: Submit the answer and log the page
      return await this.submitAnswerAndLogPage(answer);
    } catch (error) {
      console.error('Error in getAndAnswerAndPost:', error);
      throw error;
    }
  }
}
