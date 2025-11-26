import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExceptionFilter } from './common/filters/http-exception.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useGlobalFilters(new ApiExceptionFilter());
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
      validationError: { target: false, value: false },
    }),
  );

  // ========= SỬA LẠI ĐOẠN NÀY =========
  const config = app.get(ConfigService);

  // Cấu hình CORS mở rộng hoàn toàn để tránh lỗi IP
  app.enableCors({
    origin: true, // <--- QUAN TRỌNG: Cho phép tất cả các nguồn (IP, Domain)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true, // Cho phép gửi cookie
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
  // =====================================

  const port = config.get<number>('app.port') ?? Number(process.env.PORT ?? 3000);

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 ${config.get('app.name') ?? 'App'} running at http://0.0.0.0:${port}`);
}
bootstrap();