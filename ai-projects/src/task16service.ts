import { Injectable } from '@nestjs/common';
import { ReportService } from './report.service';
import { AidevsApiService } from './aidevs-api.service';
import { OpenaiService } from './openai.service';
import axios from 'axios';
import * as fs from 'fs/promises';
import { ResponseInputImage } from 'openai/resources/responses/responses';
import { Task3Response } from './task3.service';

type ImageAnalysisResponse = {
  code: number;
  message: string;
};

type ImageAnalysisInput = {
  task: string;
  answer: string;
};

type Operation =
  | 'REPAIR'
  | 'DARKEN'
  | 'BRIGHTEN'
  | 'OK'
  | 'ABANDON'
  | 'SUCCESS';

type DescriptionAnalysisOutput = {
  filename: string;
  operation: Operation;
};

@Injectable()
export class Task16Service {
  constructor(
    private readonly reportService: ReportService,
    private readonly aidevsApiService: AidevsApiService,
    private readonly openaiService: OpenaiService,
  ) {}

  private async postReport(answer: string): Promise<ImageAnalysisResponse> {
    return this.aidevsApiService.postWithApiKey('/report', <ImageAnalysisInput>{
      task: 'photos',
      answer: answer,
    });
  }

  async analyzeImageAndDecideOperation(imageUrl: string): Promise<Operation> {
    const openai = this.openaiService.getInstance();
    const visionPrompt = `I have a system that can perform specific operations on the images. 
    <operations>
    - REPAIR - jeśli posiada szumy lub glitche
    - DARKEN - jeśli zdjęcie jest zbyt jasne, światło zasłania ważne elementy
    - BRIGHTEN - jeśli jest zbyt ciemne i nie widać ważnych elementów
    - OK - zdjęcie jest dobrej jakości i nie wymaga poprawy lub nie nadaje się do dalszej obróbki
    </operations>
    Your task is to analyze provided image quality and suggest operation to peform by my system. 
    
    <response>
    Return ONLY the operation to perform as a single string. Nothing else.
    </response>
    `;
    const visionResponse = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: visionPrompt },
            {
              type: 'input_image',
              image_url: imageUrl,
              detail: 'auto',
            },
          ],
        },
      ],
    });

    return visionResponse.output_text as Operation;
  }

  async decideActionFromDescription(
    description: string,
  ): Promise<DescriptionAnalysisOutput> {
    const openai = this.openaiService.getInstance();
    const analysisPrompt = `Analyze this description of the performed operation on the image and extract:
  1. The image filename (if present) - If there is no filename, return it as null.
  2. Analyze how the operation went - decide based on that what next operation on the image should be performed.
  
  Possible operations:
  <operations>
  - REPAIR - image ma szumy/glitche
  - DARKEN - image is to bright
  - BRIGHTEN - image is to dark
  - ABANDON - if the description suggest that the image is usless and should be abandoned
  - SUCCESS - if description just says that operation was succesful
  </operations>
  
  Description: ${description}
  
  <response>
  Return the response as a valid JSON format with a structure: {filename: string | null, operation: string}. Return only valid JSON and nothing else.
  </response>
  `;
    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: analysisPrompt }],
      response_format: { type: 'json_object' },
    });

    if (!analysisResponse.choices[0].message.content) {
      throw Error('Response of description analysis is invalid!');
    }

    return JSON.parse(
      analysisResponse.choices[0].message.content,
    ) as DescriptionAnalysisOutput;
  }

  async downloadAndSaveImage(
    fileName: string,
    url: string,
    folderPath: string,
  ): Promise<void> {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const fullPath = `${folderPath}/${fileName}`;

      await fs.writeFile(fullPath, response.data);
    } catch (error) {
      console.error('Error downloading or saving image:', error);
      throw error;
    }
  }

  async downloadFinalImages(
    finalImages: Array<{ url: string; filename: string; status: string }>,
  ): Promise<void> {
    const folderPath = 'src/localAssets/barbara_photos';

    // Filter out abandoned images and only download OK ones
    const imagesToDownload = finalImages.filter((img) => img.status === 'OK');

    const downloadPromises = imagesToDownload.map((image) =>
      this.downloadAndSaveImage(image.filename, image.url, folderPath),
    );

    try {
      await Promise.all(downloadPromises);
    } catch (error) {
      console.error('Error downloading final images:', error);
      throw error;
    }
  }

  async processImages(): Promise<void> {
    // Step 1: Start the process
    const startResponse = await this.postReport('START');
    const message = startResponse.message;

    const openai = this.openaiService.getInstance();

    // Step 2: Analyze message with OpenAI to get URLs and filenames
    const analysisPrompt = `Analyze this message and extract URLs that will allow to download the photos. Message: ${message}. Also extract file names. Return response as JSON in a format: {filename: string, url: string}[]. Return only valid JSON and nothing else. Don't add markdown syntax.`;
    const analysisResponse = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: [{ role: 'user', content: analysisPrompt }],
    });

    if (!analysisResponse.output_text) {
      throw Error('Response of initial analysis is invalid!');
    }
    console.log(analysisResponse.output_text);

    const imageData = JSON.parse(analysisResponse.output_text) as Array<{
      url: string;
      filename: string;
    }>;

    console.log('Initial images data:');
    console.dir(imageData, { depth: null, colors: null });

    // Process each image
    const finalImages = [];
    for (const image of imageData) {
      let currentImageUrl = image.url;
      let previousImageName = image.filename;
      let currentFilename = image.filename;
      let isProcessing = true;
      let changedOperation = null;

      console.log('Starting process for image: ' + currentFilename);

      while (isProcessing) {
        // Step 3: Analyze image quality using Vision model

        // Step 4: Send operation to API
        const analyzedOperation =
          changedOperation ??
          (await this.analyzeImageAndDecideOperation(currentImageUrl));

        console.log(
          currentFilename + ' image analyzed operation ' + analyzedOperation,
        );

        changedOperation = null;

        if (analyzedOperation === 'OK') {
          isProcessing = false;
          finalImages.push({
            url: currentImageUrl,
            filename: currentFilename,
            status: 'OK',
          });
          console.log(currentFilename + ' is completed.');

          continue;
        }

        const operationResponse = await this.postReport(
          `${analyzedOperation} ${currentFilename}`,
        );

        console.log(
          currentFilename + ' operation response ' + operationResponse.message,
        );

        const nextAction = await this.decideActionFromDescription(
          operationResponse.message,
        );

        console.log(currentFilename + ' next action:');
        console.dir(nextAction, { depth: null, colors: null });

        if (nextAction.filename) {
          currentFilename = nextAction.filename;
          currentImageUrl =
            'https://centrala.ag3nts.org/dane/barbara/' + currentFilename;
          if (previousImageName === currentFilename) {
            isProcessing = false;
            finalImages.push({
              url: currentImageUrl,
              filename: currentFilename,
              status: 'OK',
            });
            continue;
          }
          previousImageName = nextAction.filename;
        }
        if (
          nextAction.operation !== 'ABANDON' &&
          nextAction.operation !== 'SUCCESS'
        ) {
          console.log(
            currentFilename +
              ' continue with different operation: ' +
              nextAction.operation,
          );
          changedOperation = nextAction.operation;
        }

        if (nextAction.operation === 'ABANDON') {
          isProcessing = false;
          finalImages.push({
            url: currentImageUrl,
            filename: currentFilename,
            status: 'ABANDON',
          });
          console.log(currentFilename + ' is abandoned.');
          continue;
        }
      }
    }

    await this.downloadFinalImages(finalImages);
  }

  async getImageUrlsFromFolder(folderPath: string): Promise<string[]> {
    const files = await fs.readdir(folderPath);
    return files.map(
      (filename) => `https://centrala.ag3nts.org/dane/barbara/${filename}`,
    );
  }

  async generateDetailedDescription(imageUrls: string[]): Promise<string> {
    const taskDescription = `Przeanalizuj dokładnie zdjęcia i stwórz szczegółowy rysopis osoby o imieniu Barbara. 
    Nie wiemy jak dokładnie wygląda Barbara, na zdjeciach mogą być inne osoby, natomiast Barbara będzie najpewniej osoba która się powtarza na różnych zdjęciach, wybierz ją na podstawie powtarzających się cech na różnych zdjęciach. 
    Opisz wszystkie charakterystyczne cechy wyglądu, takie jak: wzrost, budowa ciała, kształt twarzy, kolor i styl włosów, oczy, nos, usta, znaki szczególne, ubiór. 
    Rysopis powinien być na tyle szczegółowy, aby można było rozpoznać tę osobę na podstawie opisu. Zwróć TYLKO rysopis i nic więcej.`;

    const imagesInputs: ResponseInputImage[] = imageUrls.map((url) => ({
      type: 'input_image',
      image_url: url,
      detail: 'auto',
    }));

    const openai = this.openaiService.getInstance();
    const response = await openai.responses.create({
      model: 'gpt-4.1',
      input: [
        {
          role: 'system',
          content:
            'Jesteś ekspertem w tworzeniu szczegółowych rysopisów osób. Twoim zadaniem jest stworzenie bardzo dokładnego opisu wyglądu osoby ze zdjęcia, zwracając uwagę na wszystkie charakterystyczne cechy wyglądu.',
        },
        {
          role: 'user',
          content: [
            { type: 'input_text', text: taskDescription },
            ...imagesInputs,
          ],
        },
      ],
    });

    const description = response.output_text;
    return Buffer.from(description, 'utf-8').toString('utf-8');
  }

  async generateBarbaraDescription(): Promise<Task3Response> {
    const folderPath = 'src/localAssets/barbara_photos';
    const imageUrls = await this.getImageUrlsFromFolder(folderPath);
    const description = await this.generateDetailedDescription(imageUrls);
    return this.reportService.reportAnswer({
      task: 'photos',
      answer: description,
    });
  }
}
