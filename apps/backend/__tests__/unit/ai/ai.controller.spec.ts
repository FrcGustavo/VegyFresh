import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from 'src/ai/ai.controller';
import { AiService } from 'src/ai/ai.service';

describe('AiController', () => {
  let controller: AiController;
  const aiServiceMock = {
    interpretMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: aiServiceMock }],
    }).compile();

    controller = module.get<AiController>(AiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
