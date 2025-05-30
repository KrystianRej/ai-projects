/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ConfigService } from '@nestjs/config';
import { OpenaiService } from './openai.service';
import axios from 'axios';
import { marked } from 'marked';
import * as cheerio from 'cheerio';
import { Injectable } from '@nestjs/common';
import { CheerioAPI } from 'cheerio';
import { Task3Response } from './task3.service';

const baseUrl = 'https://c3ntrala.ag3nts.org/dane/';

@Injectable()
export class Task10Service {
  constructor(
    private readonly configService: ConfigService,
    private readonly openaiService: OpenaiService,
  ) {}

  async fetchAndProcessHtml(url: string): Promise<string> {
    try {
      // Fetch HTML content
      const response = await axios.get<string>(url);
      const html = response.data;
      // Load HTML into cheerio for parsing
      const $: CheerioAPI = cheerio.load(html);

      // Process images
      const imagePromises = $('img')
        .map(async (_: number, element) => {
          const imgUrl = `${baseUrl}${$(element).attr('src')}`;
          console.log('imgUrl', imgUrl);

          if (!imgUrl) return;

          // Get figcaption content if it exists
          const figcaption = $(element).next('figcaption').text();
          const captionText = figcaption
            ? `\nImage caption: ${figcaption}`
            : '';

          // Download image and convert to base64
          const imageResponseAxios = await axios.get(imgUrl, {
            responseType: 'arraybuffer',
          });
          const base64Image = Buffer.from(imageResponseAxios.data).toString(
            'base64',
          );

          // Get image description from OpenAI
          const openai = this.openaiService.getInstance();
          const imageResponse = await openai.responses.create({
            model: 'gpt-4.1-mini',
            input: [
              {
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text: `Describe this image in detail.${captionText}`,
                  },
                  {
                    type: 'input_image',
                    image_url: `data:image/png;base64,${base64Image}`,
                    detail: 'auto',
                  },
                ],
              },
            ],
          });

          const description = imageResponse.output_text;
          $(element).replaceWith(`[Image: ${description}]`);
        })
        .get();

      // Process audio
      const audioPromises = $('source')
        .map(async (_, element) => {
          const audioUrl = `${baseUrl}${$(element).attr('src')}`;
          console.log('audioUrl', audioUrl);
          if (!audioUrl) return;

          // Get audio transcription from OpenAI
          const openai = this.openaiService.getInstance();
          const audioResponse = await openai.audio.transcriptions.create({
            file: await this.fetchAudioFile(audioUrl),
            model: 'whisper-1',
          });

          const transcription = audioResponse.text;
          $(element).replaceWith(`[Audio Transcription: ${transcription}]`);
        })
        .get();

      // Wait for all async operations to complete
      await Promise.all([...imagePromises, ...audioPromises]);
      // Convert to markdown and remove HTML tags
      // Remove HTML tags and convert to markdown
      const htmlContent = $.html();
      const cleanHtml = htmlContent.replace(/<[^>]*>/g, '');
      const markdown = marked(cleanHtml, { gfm: true });
      return markdown;
    } catch (error) {
      console.error('Error processing HTML:', error);
      throw error;
    }
  }

  private async saveMarkdownToFile(
    markdown: string,
    folderPath: string,
  ): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Create folder if it doesn't exist
    await fs.mkdir(folderPath, { recursive: true });

    // Generate filename with timestamp
    const filename = `converted_to_markdown.md`;
    const filePath = path.join(folderPath, filename);

    // Write markdown to file
    await fs.writeFile(filePath, markdown, 'utf-8');
  }

  private async loadMarkdownFromFolder(
    folderPath: string,
  ): Promise<string | null> {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const files = await fs.readdir(folderPath);
      const markdownFile = files.find((file) => file.endsWith('.md'));

      if (!markdownFile) {
        return null;
      }

      const filePath = path.join(folderPath, markdownFile);
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error('Error loading markdown file:', error);
      return null;
    }
  }

  public async processMarkdown(): Promise<string> {
    let markdown = await this.loadMarkdownFromFolder(
      'src/localAssets/markdown',
    );

    if (!markdown) {
      markdown = await this.fetchAndProcessHtml(
        'https://c3ntrala.ag3nts.org/dane/arxiv-draft.html',
      );

      await this.saveMarkdownToFile(markdown, 'src/localAssets/markdown');
    }

    return markdown;
  }

  private async analyzeMarkdownWithQuestions(
    markdown: string,
    questions: string,
  ): Promise<Record<string, string>> {
    const openai = this.openaiService.getInstance();

    const prompt = `
    Analyze the following markdown content and answer these questions in a format where each answer is a single short sentence.
    Return the response as a JSON object where keys are question numbers and values are answers.
    Questions are in a format number=question, eq. 01=question.
    
    Questions:
    ${questions}
    

    Content additional informations:
    1. Some text fragments starts with 'Image:' - it means that there was image and now is replaces with this image description.
    2. Some text fragments starts with 'Audio Transcription:' - it means that it is a transcription from a recording.

    Content to analyze:
    ${markdown}
    
    <response>
    JSOn format: 
    {"01":"answer1", "02":"answer2"}
    </response>
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content as string);
    return result;
  }

  public async processMarkdownAnswerQuestions(): Promise<Task3Response> {
    const markdown = await this.processMarkdown();
    const apikey = this.configService.get<string>('AI_DEVS_AI_KEY');
    const questions = await this.fetchTextFromEndpoint(
      `https://c3ntrala.ag3nts.org/data/${apikey}/arxiv.txt`,
    );

    const answers = await this.analyzeMarkdownWithQuestions(
      markdown,
      questions,
    );
    const reportRes = await this.reportAnswer(answers);

    return reportRes;
  }

  private async fetchTextFromEndpoint(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        responseType: 'text',
      });
      return response.data;
    } catch (error: any) {
      const finalError =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(error);
      throw new Error(`Failed to fetch text from endpoint: ${finalError}`);
    }
  }

  async reportAnswer(answer: object): Promise<Task3Response> {
    const apikey = this.configService.get<string>('AI_DEVS_AI_KEY');
    const payload = {
      task: 'arxiv',
      apikey,
      answer: {
        ...answer,
      },
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
      return { ...response.data, answer: answer };
    } catch (error: any) {
      const finalError =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(error);
      throw new Error(`Report request failed: ${finalError}`);
    }
  }

  private async fetchAudioFile(url: string): Promise<File> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    return new File([buffer], 'audio.mp3', { type: 'audio/mpeg' });
  }
}
