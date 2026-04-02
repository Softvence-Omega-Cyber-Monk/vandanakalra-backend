import { Test, TestingModule } from '@nestjs/testing';
import { EnrollementService } from './enrollement.service';

describe('EnrollementService', () => {
  let service: EnrollementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnrollementService],
    }).compile();

    service = module.get<EnrollementService>(EnrollementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
