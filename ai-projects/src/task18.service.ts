import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { ReportService } from './report.service';
import { AidevsApiService } from './aidevs-api.service';
import { FileService } from './file.service';
import { OpenaiService } from './openai.service';
import { Task3Response } from './task3.service';
import { task18PromptSecret } from './prompts/task18';

@Injectable()
export class Task18Service {
  private readonly nhm = new NodeHtmlMarkdown();

  constructor(
    private readonly reportService: ReportService,
    private readonly aidevsApiService: AidevsApiService,
    private readonly openaiService: OpenaiService,
    private readonly fileService: FileService,
  ) {}

  async convertHtmlToMarkdown(url: string): Promise<string> {
    try {
      const response = await axios.get<string>(url);
      const html = response.data;
      const markdown = this.nhm.translate(html);
      return markdown;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      console.error('Error converting HTML to Markdown:');
      return 'INVALID_URL';
    }
  }

  async analyzePageForAnswer(
    markdown: string,
    question: string,
    invalidUrls: string[],
  ): Promise<{ answer: string | null; nextUrl: string | null }> {
    console.log('invalid urls: ', invalidUrls.join(','));

    try {
      // First get the HTML content and convert to markdown

      // Prepare the prompt for OpenAI
      const prompt = task18PromptSecret(markdown, question, invalidUrls);

      // Call OpenAI API using the service instance
      const openai = this.openaiService.getInstance();
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that analyzes web content and finds answers to questions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0,
      });

      if (!response.choices[0].message.content) {
        throw Error('Invalid response from OpenAI');
      }

      const result = JSON.parse(response.choices[0].message.content) as {
        answer: string | null;
        nextUrl: string | null;
      };

      return {
        answer: result.answer,
        nextUrl: result.nextUrl,
      };
    } catch (error) {
      console.error('Error analyzing page:', error);
      throw error;
    }
  }

  async loadQuestions(): Promise<Record<string, string>> {
    try {
      const fileContent = await this.aidevsApiService.getWithApiKey<
        Record<string, string>
      >('/data/TUTAJ-KLUCZ/softo.json');
      const questions = fileContent;
      return questions;
    } catch (error) {
      console.error('Error loading questions:', error);
      throw error;
    }
  }

  async processQuestions(
    questions: Record<string, string>,
  ): Promise<Record<string, string>> {
    try {
      // Load questions from the API

      console.log('Questions:', questions);

      const results: Record<string, string> = {};

      const baseUrl = `https://softo.ag3nts.org`;

      const initialMarkdown = await this.convertHtmlToMarkdown(baseUrl);

      // Process each question
      for (const [questionId, question] of Object.entries(questions)) {
        let currentMarkdown = initialMarkdown;
        let answer: string | null = null;
        let nextUrl: string | null = '/';
        const visitedUrls: string[] = [];

        // Keep following URLs until we find an answer or run out of URLs
        console.log('Start analysis for question: ' + question);

        while (nextUrl && !answer) {
          const markdownResult =
            nextUrl !== '/'
              ? await this.convertHtmlToMarkdown(
                  nextUrl.includes(baseUrl) ? nextUrl : `${baseUrl}${nextUrl}`,
                )
              : initialMarkdown;

          visitedUrls.push(nextUrl);

          currentMarkdown =
            markdownResult === 'INVALID_URL' ? currentMarkdown : markdownResult;

          const analysis = await this.analyzePageForAnswer(
            currentMarkdown,
            question,
            visitedUrls,
          );

          console.log('Analysis:', analysis);

          if (analysis.answer) {
            answer = analysis.answer;
            results[questionId] = answer;
          } else if (analysis.nextUrl) {
            nextUrl = visitedUrls.includes(analysis.nextUrl)
              ? '/'
              : analysis.nextUrl;
          } else {
            nextUrl = null;
          }
        }

        if (!answer) {
          console.warn(
            `No answer found for question ${questionId}: ${question}`,
          );
        }
      }

      return results;
    } catch (error) {
      console.error('Error processing questions:', error);
      throw error;
    }
  }

  async processAndReportAnswers(): Promise<Task3Response> {
    const questions = await this.loadQuestions();
    const results = await this.processQuestions(questions);
    console.log('Results', results);

    return this.reportService.reportAnswer({
      task: 'softo',
      answer: results,
    });
  }

  async findNumber5(): Promise<Record<string, string>> {
    const questions = {
      '01': `Znajdź sekret w postaci {{FLG:VALUE}}. VALUE can be different. Jeśli na stronie jest coś w takiej postaci to zwróć jako answer.
      Probably url that contains the secret is not directly in the content but needs to be found carefully. TIP: Sprawdź dobrze portfolio firmy SoftoAI, chyba coś pomieszali. 
      TIP2: Musisz gdzieś tam być numerze piąty! - treść zadania związanego z sekretem.`,
    };
    const results = await this.processQuestions(questions);
    console.log('Results', results);
    return results;
  }
}
