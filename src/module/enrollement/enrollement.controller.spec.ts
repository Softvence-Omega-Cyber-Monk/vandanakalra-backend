import { Test, TestingModule } from '@nestjs/testing';
import { EnrollementController } from './enrollement.controller';

describe('EnrollementController', () => {
  let controller: EnrollementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrollementController],
    }).compile();

    controller = module.get<EnrollementController>(EnrollementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
