import { Injectable } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { OpenaiService } from './openai.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Task3Response } from './task3.service';
@Injectable()
export class Task8Service {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly openaiService: OpenaiService,
    private readonly configService: ConfigService,
  ) {}

  async fetchRobotDescription(): Promise<string> {
    const apikey = this.configService.get<string>('AI_DEVS_AI_KEY');
    const url = `https://c3ntrala.ag3nts.org/data/${apikey}/robotid.json`;
    try {
      const response = await axios.get<object>(url, { responseType: 'json' });
      return JSON.stringify(response.data);
    } catch (error: unknown) {
      console.error(error);
      throw new Error(
        `Failed to fetch cenzura data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  prepareRobotImagePrompt(robotDescriptionJson: string): string {
    return (
      `You are an expert illustrator. Based on the following JSON object, create a highly detailed, realistic image of the described robot. ` +
      `Focus on accurately visualizing the robot's appearance, features, and any notable details mentioned. ` +
      `JSON description: ${robotDescriptionJson}`
    );
  }

  async generateRobotImage(robotDescription: string): Promise<string> {
    const openai = this.openaiService.getInstance();

    // Generate image with DALL-E
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: this.prepareRobotImagePrompt(robotDescription),
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    });

    // Get the base64 image string
    const base64Image = response?.data?.[0].b64_json;

    if (!base64Image) {
      throw new Error('Failed to generate robot image');
    }

    return base64Image;
  }

  async uploadRobotImage(base64Image: string): Promise<string> {
    // Prepare the image for Cloudinary upload
    const imageData = `data:image/png;base64,${base64Image}`;

    // Upload to Cloudinary
    const imageUrl = await this.cloudinaryService.uploadImage(imageData);

    return imageUrl;
  }

  async reportAnswer(answer: string): Promise<Task3Response> {
    const apikey = this.configService.get<string>('AI_DEVS_AI_KEY');
    const payload = {
      task: 'robotid',
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
      return { ...response.data, robotUrl: answer };
    } catch (error: any) {
      const finalError =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(finalError);
      throw new Error(`Report request failed: ${finalError}`);
    }
  }

  async performRobotImageGeneration(): Promise<Task3Response> {
    const robotDescription = await this.fetchRobotDescription();
    const base64Image = await this.generateRobotImage(robotDescription);
    console.log('Generated base64:', base64Image);
    const robotUrl = await this.uploadRobotImage(base64Image);
    console.log('Generated iamgeUrl:', robotUrl);
    return this.reportAnswer(robotUrl);
  }
}
