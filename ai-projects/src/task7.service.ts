import { Injectable } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import {
  ResponseInput,
  ResponseInputImage,
} from 'openai/resources/responses/responses';

@Injectable()
export class Task7Service {
  constructor(private readonly openaiService: OpenaiService) {}

  async loadJpgImagesAsBase64(folderPath: string): Promise<string[]> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const files = await fs.readdir(folderPath);
    const jpgFiles = files.filter(
      (file) =>
        file.toLowerCase().endsWith('.jpg') ||
        file.toLowerCase().endsWith('.jpeg'),
    );

    const imagesBase64: string[] = [];
    for (const file of jpgFiles) {
      const filePath = path.join(folderPath, file);
      const data = await fs.readFile(filePath);
      imagesBase64.push(data.toString('base64'));
    }
    return imagesBase64;
  }

  async identifyCityFromMapImages(images: string[]): Promise<string> {
    const prompt = `
Otrzymujesz kilka fragmentów mapy miasta w formie obrazów. 
1. Jeden z fragmentów mapy może być błędny i pochodzić z innego miasta.
2. Zidentyfikuj nazwy ulic, charakterystycznych obiektów (np. cmentarzy, kościołów, szkół) i układ urbanistyczny.
3. Upewnij się, że wszystkie rozpoznane lokalizacje na mapie na pewno znajdują się w mieście, które zamierzasz zwrócić jako odpowiedź.
4. W szukanym mieście znajdują się spichlerze i twierdze.
5. Miasto znajduje się w Polsce.
6. Odpowiedź powinna zawierać wyłącznie nazwę miasta i nic więcej.

Na podstawie przesłanych obrazów mapy, podaj nazwę miasta.
`;

    const openai = this.openaiService.getInstance();
    const imagesContent: ResponseInputImage[] = images.map((img) => ({
      type: 'input_image',
      image_url: `data:image/jpeg;base64,${img}`,
      detail: 'auto',
    }));
    const messages: ResponseInput = [
      {
        role: 'user',
        content: [{ type: 'input_text', text: prompt }, ...imagesContent],
      },
    ];

    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: messages,
      temperature: 0,
    });

    const cityName = response.output_text;
    return cityName;
  }

  async performMapCityIdentification(): Promise<string> {
    const folderPath = 'src/localAssets/mapy';
    // Load images from the folder as base64
    const images = await this.loadJpgImagesAsBase64(folderPath);
    // Pass images to OpenAI method and return the result
    const cityName = await this.identifyCityFromMapImages(images);
    return cityName;
  }
}
