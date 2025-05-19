import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Task2Service } from './task2.service';
import { Task3Service, Task3Response } from './task3.service';
import { Task5Service } from './task5.service';
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly task2Service: Task2Service,
    private readonly task3Service: Task3Service,
    private readonly task5Service: Task5Service,
  ) {}

  @Get('content')
  async getContent(): Promise<string> {
    return this.appService.getAndAnswerAndPost();
  }

  @Get('verify')
  async verify(): Promise<object> {
    return this.task2Service.performVerification();
  }

  @Get('task3')
  async task3(): Promise<Task3Response> {
    return this.task3Service.updateAndReportData();
  }

  @Get('task5')
  async task5(): Promise<Task3Response> {
    return this.task5Service.censorAndReport();
  }
}
