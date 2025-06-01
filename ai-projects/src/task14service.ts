import { Injectable } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { ReportService } from './report.service';
import { FileService } from './file.service';
import { AidevsApiService } from './aidevs-api.service';
import { Task3Response } from './task3.service';
@Injectable()
export class Task14Service {
  constructor(
    private readonly openaiService: OpenaiService,
    private readonly reportService: ReportService,
    private readonly fileService: FileService,
    private readonly aidevsApiService: AidevsApiService,
  ) {}

  private normalizeWord(word: string): string {
    return word
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[Łł]/g, 'L')
      .replace(/[Ąą]/g, 'A')
      .replace(/[Ćć]/g, 'C')
      .replace(/[Ęę]/g, 'E')
      .replace(/[Ńń]/g, 'N')
      .replace(/[Óó]/g, 'O')
      .replace(/[Śś]/g, 'S')
      .replace(/[Źź]/g, 'Z')
      .replace(/[Żż]/g, 'Z');
  }

  async extractNamesAndCities(): Promise<{
    people: string[];
    cities: string[];
  }> {
    const text = await this.aidevsApiService.getData('barbara.txt');

    const openai = this.openaiService.getInstance();
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            'Extract all person names and city names from the given text. Return a JSON object with two arrays: "people" containing all person names (ONLY names, skip surnames) and "cities" containing all city names. Only return the JSON object, no additional text. Miasta i Imiona muszą być w MIANOWNIKU i bez polskich znaków, nie może być duplikacji miast ani imion.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    const result = JSON.parse(content) as {
      people: string[];
      cities: string[];
    };
    return {
      people: result.people,
      cities: result.cities,
    };
  }

  public async findBarbara(): Promise<Task3Response | null> {
    let people: string[] = [];
    let cities: string[] = [];

    let barbaraLocationRes: Task3Response | null = null;

    const savedData = await this.fileService.loadSpecificFileFromFolder(
      'src/localAssets/loop',
      'peopleCities.txt',
    );

    if (!savedData) {
      const extractedData = await this.extractNamesAndCities();
      people = extractedData.people;
      cities = extractedData.cities;

      await this.fileService.saveTextToFile(
        'src/localAssets/loop',
        'peopleCities.txt',
        JSON.stringify({ people, cities }),
      );
    } else {
      const parsedData = JSON.parse(savedData) as {
        people: string[];
        cities: string[];
      };
      people = parsedData.people;
      cities = parsedData.cities;
    }

    console.log('Starting People: ', people);
    console.log('Starting Cities: ', cities);

    const peopleQueue = [...people].map((p) => this.normalizeWord(p));
    const citiesQueue = [...cities].map((p) => this.normalizeWord(p));
    const visitedPeople = new Set<string>();
    const visitedCities = new Set<string>();

    while (peopleQueue.length > 0 || citiesQueue.length > 0) {
      // Process people queue
      if (peopleQueue.length > 0) {
        const person = peopleQueue.shift()!;
        const normalizedPerson = this.normalizeWord(person);

        if (!visitedPeople.has(normalizedPerson)) {
          visitedPeople.add(normalizedPerson);
          const response = await this.aidevsApiService.postQuery<{
            code: number;
            message: string;
          }>('/people', normalizedPerson);
          console.log('Response for person: ', normalizedPerson);
          console.dir(response, { depth: null, colors: true });

          if (
            response.code === 0 &&
            response.message !== '[**RESTRICTED DATA**]'
          ) {
            const places = response.message.split(' ');
            for (const place of places) {
              if (!visitedCities.has(place)) {
                citiesQueue.push(place);
              }
            }
          }
        }
      }

      // Process cities queue
      if (citiesQueue.length > 0) {
        const city = citiesQueue.shift()!;
        const normalizedCity = this.normalizeWord(city);

        if (!visitedCities.has(normalizedCity)) {
          visitedCities.add(normalizedCity);
          const response = await this.aidevsApiService.postQuery<{
            code: number;
            message: string;
          }>('/places', normalizedCity);
          console.log('Response for city: ', normalizedCity);
          console.dir(response, { depth: null, colors: true });

          if (
            response.code === 0 &&
            response.message !== '[**RESTRICTED DATA**]'
          ) {
            const people = response.message.split(' ');
            for (const person of people) {
              if (person === 'BARBARA') {
                try {
                  const res = await this.reportService.reportAnswer({
                    task: 'loop',
                    answer: normalizedCity,
                  });
                  console.log('Found Barbara in city: ', normalizedCity);
                  barbaraLocationRes = res;
                } catch {
                  console.log('Barbara not in this city: ' + normalizedCity);
                }
              }
              if (!visitedPeople.has(person)) {
                peopleQueue.push(person);
              }
            }
          }
        }
      }
    }

    return barbaraLocationRes;
  }
}
