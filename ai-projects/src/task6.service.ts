import { Injectable } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import * as fs from 'fs';
import * as path from 'path';
import { Task3Response } from './task3.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
@Injectable()
export class Task6Service {
  constructor(
    private readonly openaiService: OpenaiService,
    private readonly configService: ConfigService,
  ) {}

  async transcribeM4AFilesFromFolder(
    folderPath: string,
    generateNewIfExists: boolean,
  ): Promise<string> {
    const transcriptsDir = 'src/transcripts';
    const transcriptFilePath = path.join(transcriptsDir, 'transcript1');

    // Ensure the transcripts directory exists
    if (!fs.existsSync(transcriptsDir)) {
      fs.mkdirSync(transcriptsDir, { recursive: true });
    }

    // Check if transcript1 file exists
    if (fs.existsSync(transcriptFilePath) && !generateNewIfExists) {
      // Load and return the content
      return fs.readFileSync(transcriptFilePath, 'utf-8');
    }

    const openai = this.openaiService.getInstance();
    const transcripts = [];
    // Read all files in the folder
    const files = fs.readdirSync(folderPath);

    // Filter for .m4a files
    const m4aFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === '.m4a',
    );

    for (const file of m4aFiles) {
      const filePath = path.join(folderPath, file);

      // Read the file as a stream
      const fileStream = fs.createReadStream(filePath);

      try {
        // Use OpenAI Whisper API to transcribe
        const response = await openai.audio.transcriptions.create({
          file: fileStream, // fileStream is a readable stream as required
          model: 'whisper-1',
          response_format: 'text',
        });

        // The OpenAI Whisper API with response_format: 'text' returns a string.
        // Defensive: If not a string, fallback to empty string.
        transcripts.push(response);
      } catch (error) {
        console.error(`Failed to transcribe ${file}:`, error);
        throw error;
      }
    }

    const finalTranscript = transcripts.join('\n');
    // Save the transcript to the file
    fs.writeFileSync(transcriptFilePath, finalTranscript, 'utf-8');
    return finalTranscript;
  }

  async answerQuestionFromTranscript(
    transcript: string,
    question: string,
    additionalInstructions?: string,
  ): Promise<string> {
    const openai = this.openaiService.getInstance();

    const systemPrompt = `
You are an expert assistant. You will be given a transcript of an audio recording as CONTEXT. 
Your task is to answer the USER QUESTION based on the transcript, analyzing the transcript step by step and drawing logical conclusions. 
If the answer is not directly in the transcript, use your own knowledge and reasoning to provide the best possible answer.
If the answer cannot be found or inferred, say "I don't know based on the transcript."

CONTEXT:
${transcript}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: additionalInstructions ?? '' },
        { role: 'user', content: question },
      ],
      max_tokens: 512,
      temperature: 0.2,
    });

    return response.choices[0].message.content?.trim() || '';
  }

  async reportAnswer(answer: string | object): Promise<Task3Response> {
    const apikey = this.configService.get<string>('AI_DEVS_AI_KEY');
    const payload = {
      task: 'mp3',
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

  async performTranscriptAnalysis(): Promise<Task3Response> {
    const transcript = await this.transcribeM4AFilesFromFolder(
      'src/localAssets/przesluchania',
      false,
    );

    const answer = await this.answerQuestionFromTranscript(
      transcript,
      'Na jakiej ulicy znajduje się konkretny instytut uczelni, gdzie wykłada profesor Andrzej Maj?',
      `
      Odpowiedz po polsku. Użyj swojej własnej wiedzy na temat konkretnej uczelni, aby ustalić nazwę ulicy. W odpowiedzi podaj tylko nazwę ulicy, nic więcej.
      `,
    );

    console.log(answer);

    return this.reportAnswer(answer);
  }
}
