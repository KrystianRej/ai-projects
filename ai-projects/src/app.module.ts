import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OpenaiService } from './openai.service';
import { Task2Service } from './task2.service';
import { Task3Service } from './task3.service';
import { Task5Service } from './task5.service';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    OpenaiService,
    Task2Service,
    Task3Service,
    Task5Service,
  ],
})
export class AppModule {}
