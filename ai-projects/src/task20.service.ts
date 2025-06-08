import { Injectable } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';
import { FileService } from './file.service';
import { pdfToPng } from 'pdf-to-png-converter';
import { OpenaiService } from './openai.service';
import { ResponseInput } from 'openai/resources/responses/responses';
import { AidevsApiService } from './aidevs-api.service';
import { Task3Response } from './task3.service';

type WrongAnswers = {
  message: string;
  hint: string;
  debug: string;
};

type WrongAnswersX = {
  questionNumber: string;
  hint: string;
  previousAnswer: string;
};

type CorrectedAnswers = {
  questionNumber: string;
  hint: string;
  previousAnswers: string[];
};

const groupWrongAnswers = (answers: WrongAnswersX[]): CorrectedAnswers[] => {
  const groupedMap = new Map<string, CorrectedAnswers>();

  answers.forEach((answer) => {
    if (groupedMap.has(answer.questionNumber)) {
      groupedMap
        .get(answer.questionNumber)!
        .previousAnswers.push(answer.previousAnswer);
    } else {
      groupedMap.set(answer.questionNumber, {
        questionNumber: answer.questionNumber,
        hint: answer.hint,
        previousAnswers: [answer.previousAnswer],
      });
    }
  });

  return Array.from(groupedMap.values());
};

@Injectable()
export class Task20Service {
  constructor(
    private readonly fileService: FileService,
    private readonly openaiService: OpenaiService,
    private readonly aidevsService: AidevsApiService,
  ) {}

  private async extractTextFromPdf(
    dataBuffer: Buffer,
    maxPage: number,
  ): Promise<string> {
    try {
      const data = await pdfParse(dataBuffer, { max: maxPage });

      return data.text;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw error;
    }
  }

  private async convertPdfToPng(
    pageNumber: number,
    outputPath: string,
  ): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await pdfToPng('src/localAssets/notatki-rafala/notatnik-rafala.pdf', {
        pagesToProcess: [pageNumber],
        outputFolder: outputPath,
        outputFileMaskFunc: (pageNumber) => `page_${pageNumber}.png`,
      });
    } catch (error) {
      console.error('Error converting PDF to PNG:', error);
      throw error;
    }
  }

  public async prepareData(): Promise<void> {
    const dataBuffer = await this.fileService.loadFileAsBuffer(
      'src/localAssets/notatki-rafala',
      'notatnik-rafala.pdf',
    );
    if (!dataBuffer) {
      throw Error('Invalid Buffer!');
    }
    const pdfAsText = await this.extractTextFromPdf(dataBuffer, 18);
    await this.fileService.saveTextToFile(
      'src/localAssets/notatki-rafala-prepared',
      'notatki-rafala-text.txt',
      pdfAsText,
    );
    await this.convertPdfToPng(19, 'src/localAssets/notatki-rafala-prepared');
    console.log('Data prepared succesfully!');
  }

  private async processPreparedData(): Promise<{
    text: string;
    photo: string;
  }> {
    const photo = await this.processTextFromRafalNotes();
    const text = await this.fileService.loadSpecificFileFromFolder(
      'src/localAssets/notatki-rafala-prepared',
      'notatki-rafala-text.txt',
    );

    if (!photo || !text) {
      throw Error('Data does not exist! Prepare it first.');
    }

    return { photo, text };
  }

  private async processTextFromRafalNotes() {
    const finalFileName = 'notatki-rafala-photo-text.txt';
    let textFromPng = await this.fileService.loadSpecificFileFromFolder(
      'src/localAssets/notatki-rafala-prepared',
      finalFileName,
    );

    if (!textFromPng) {
      const photo = await this.fileService.loadImageAsBase64(
        'src/localAssets/notatki-rafala-prepared/page_19.png',
      );
      if (!photo) {
        throw Error('Prepare png to analyze first!');
      }
      textFromPng = await this.openaiService.extractTextFromBase64Image(photo);
      await this.fileService.saveTextToFile(
        'src/localAssets/notatki-rafala-prepared',
        finalFileName,
        textFromPng,
      );
    }

    return textFromPng;
  }

  public async answerQuestions(): Promise<string> {
    const data = await this.processPreparedData();
    const openai = this.openaiService.getInstance();

    const whatWasWrong: WrongAnswersX[] = [];

    let arrayForPrompt: CorrectedAnswers[] = [];

    const systemPrompt = `You are specialist in analyzing the text and answering questions based on it.
    
    Rules:
    - You will get awway of question objects in a format:
    [{
      "questionNumber": string,
      "question": string,
      "wrongAnswers": string[],
      "hint": string
    }]
    - "wrongAnswers" for question are answers that are 100% wrong, find different answer - DO NOT RETURN ONE OF THE VALUES FROM wrongAnswers array as ANSWER - it is wrong
    - "hint" - very important, it will help you find correct answer for the question
    - correct answer is ONE WORD
    - Return answers as object in the JSON format:
    {
      ["questionNumber"]: "answer"
    }
    - Return only answers to the questions, nothing else. Answers should be short and concrete and specific, without additional text.
    - You will get content with text that you need to use to answer questions - it was extracted from the pdf file
    - Sometimes answers are not direct, you need to analyze whole text and connect facts together to find an answer.
    - Before answering analyze the whole text carefully, connct facts together.
    - If the full year is not provided in text it means you need to analyze events described in text to know the year (which year this events happend)
    - Always before giving answer to the question check if "debug" value for that question contains this answer, if yes, provide different answer
    - Text may contain errors, mostly in names of the cities or places. If they name of the place you don't recognize it is probably close to Grudziądz in Poland.


    Content:
   ${data.text}

   Last page of the pdf - it was image, from which text was extracted.
   ${data.photo}

    `;

    let allGood = false;

    const questions = await this.aidevsService.getWithApiKey<
      Record<string, string>
    >('/data/TUTAJ-KLUCZ/notes.json');

    let promptQuestions: {
      questionNumber: string;
      question: string;
      wrongAnswers: string[];
      hint: string;
    }[] = Object.entries(questions).map(([questionNumber, question]) => ({
      questionNumber,
      question,
      wrongAnswers: [],
      hint: '',
    }));

    let finalResponse = '';
    console.log('Questions:');
    console.log(questions);
    while (!allGood) {
      const questionsPrompt = `
    Questions:
    ${JSON.stringify(promptQuestions)}
    `;

      console.log('Wrong answers:');
      console.dir(arrayForPrompt, { depth: null });

      const messages: ResponseInput = [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemPrompt }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: questionsPrompt }],
        },
      ];
      const response = await openai.responses.create({
        model: 'gpt-4.1',
        input: messages,
        temperature: 0,
      });

      const answers = JSON.parse(response.output_text) as Record<
        string,
        string
      >;

      console.log('Answers:');
      console.log(answers);
      console.log('---------------------------------');

      const reportRes = await this.postReport(answers);

      console.log('Report response:');
      console.log(reportRes);
      console.log('---------------------------------');

      if (reportRes.message.includes('{{FLG')) {
        allGood = true;
        finalResponse = reportRes.message;
      } else {
        const wrongAnswers = reportRes as WrongAnswers;
        if (
          !whatWasWrong.find(
            (x) =>
              x.previousAnswer ===
              wrongAnswers.debug.split('You sent:')[1]?.trim(),
          )
        ) {
          whatWasWrong.push({
            questionNumber:
              wrongAnswers.message.match(/\d+/)?.[0] || wrongAnswers.message,
            hint: wrongAnswers.hint,
            previousAnswer:
              wrongAnswers.debug.split('You sent:')[1]?.trim() ||
              wrongAnswers.debug,
          });
          arrayForPrompt = groupWrongAnswers(whatWasWrong);
          promptQuestions = promptQuestions.map((p) => ({
            questionNumber: p.questionNumber,
            question: p.question,
            hint:
              arrayForPrompt.find((x) => x.questionNumber === p.questionNumber)
                ?.hint ?? '',
            wrongAnswers:
              arrayForPrompt.find((x) => x.questionNumber === p.questionNumber)
                ?.previousAnswers ?? [],
          }));
        }
      }
    }

    return finalResponse;
  }

  private async postReport(
    answer: Record<string, string>,
  ): Promise<WrongAnswers | Task3Response> {
    return this.aidevsService.postWithApiKey('/report', {
      task: 'notes',
      answer: answer,
    });
  }
}
