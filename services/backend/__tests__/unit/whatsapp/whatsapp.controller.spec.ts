import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappController } from 'src/whatsapp/whatsapp.controller';
import { WhatsappService } from 'src/whatsapp/whatsapp.service';

describe('WhatsappController', () => {
  let controller: WhatsappController;
  const whatsappServiceMock = {
    verifyWebhook: jest.fn(),
    handleWebhook: jest.fn(),
    sendTextMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsappController],
      providers: [{ provide: WhatsappService, useValue: whatsappServiceMock }],
    }).compile();

    controller = module.get<WhatsappController>(WhatsappController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
