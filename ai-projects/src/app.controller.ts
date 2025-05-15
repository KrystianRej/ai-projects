import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Task2Service } from './task2.service';
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly task2Service: Task2Service,
  ) {}

  @Get('content')
  async getContent(): Promise<string> {
    return this.appService.getAndAnswerAndPost();
  }

  @Get('verify')
  async verify(): Promise<object> {
    return this.task2Service.performVerification();
  }
}
