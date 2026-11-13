import { SuppliersController } from 'src/suppliers/suppliers.controller';
import { SuppliersService } from 'src/suppliers/suppliers.service';

describe('SuppliersController', () => {
  let controller: SuppliersController;

  beforeEach(() => {
    controller = new SuppliersController({} as SuppliersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
