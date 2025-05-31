import { Injectable } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ReportService } from './report.service';
import { Task3Response } from './task3.service';

export type MySqlRequest = {
  task: string;
  apikey: string;
  query: string;
};

@Injectable()
export class Task13Service {
  constructor(
    private readonly openaiService: OpenaiService,
    private readonly configService: ConfigService,
    private readonly reportService: ReportService,
  ) {}

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
    return this.postToUrl<T>('https://c3ntrala.ag3nts.org/apidb', {
      task: 'database',
      apikey,
      query,
    });
  }

  public async examinMySqlDatabase(): Promise<number[]> {
    const tablesInBanan = await this.postToMySqlRequest<{
      reply: { Tables_in_banan: string }[];
      error: string;
    }>('SHOW TABLES');

    console.dir(tablesInBanan, { depth: null, colors: true });

    const tablePromises = tablesInBanan.reply.map((table) =>
      this.postToMySqlRequest<{
        reply: { Table: string; 'Create Table': string }[];
        error: string;
      }>(`SHOW CREATE TABLE ${table.Tables_in_banan}`),
    );

    const tableResults = await Promise.all(tablePromises);

    console.dir(tableResults, { depth: null, colors: true });
    const combinedReplies = tableResults.flatMap((result) => result.reply);

    console.dir(combinedReplies, { depth: null, colors: true });

    const query = await this.generateSqlQuery(combinedReplies);

    const queryResult = await this.postToMySqlRequest<{
      reply: { dc_id: string }[];
      error: string;
    }>(query);

    return queryResult.reply.map((result) => parseInt(result.dc_id, 10));
  }

  public async examineDatabaseAndReportAnswer(): Promise<Task3Response> {
    const dcIds = await this.examinMySqlDatabase();

    return this.reportService.reportAnswer({ task: 'database', answer: dcIds });
  }

  private async generateSqlQuery(
    combinedReplies: { Table: string; 'Create Table': string }[],
  ): Promise<string> {
    const prompt = `Given the following database schema:
${combinedReplies.map((reply) => `Table: ${reply.Table}\nSchema: ${reply['Create Table']}`).join('\n\n')}

Write a SQL query that returns DC_ID of active datacenters where the managers (from users table) are inactive.
Return ONLY the raw SQL query text, without any explanations, markdown formatting or additional text.`;
    const openai = this.openaiService.getInstance();
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a SQL expert. Return only the raw SQL query without any additional text or formatting.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0,
    });

    return response.choices[0].message.content?.trim() ?? '';
  }
}
