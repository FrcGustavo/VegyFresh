import { SuppliersService } from 'src/suppliers/suppliers.service';

describe('SuppliersService', () => {
  let service: SuppliersService;

  beforeEach(() => {
    service = new SuppliersService({} as never, {} as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
