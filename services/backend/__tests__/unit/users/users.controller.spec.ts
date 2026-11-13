import { UsersController } from 'src/users/users.controller';
import { UsersService } from 'src/users/users.service';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(() => {
    controller = new UsersController({} as UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
