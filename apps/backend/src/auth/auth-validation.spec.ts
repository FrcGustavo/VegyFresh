import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  forbidUnknownValues: true,
  transform: true,
  stopAtFirstError: true,
});

describe('Auth DTO validation', () => {
  it('accepts login payload with password field', async () => {
    await expect(
      pipe.transform(
        {
          email: 'john@example.com',
          password: 'super-secure-password',
        },
        { type: 'body', metatype: LoginDto },
      ),
    ).resolves.toMatchObject({
      email: 'john@example.com',
      password: 'super-secure-password',
    });
  });

  it('rejects password_hash in login payload', async () => {
    await expect(
      pipe.transform(
        {
          email: 'john@example.com',
          password_hash: 'hashed-password',
        },
        { type: 'body', metatype: LoginDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects short password values', async () => {
    await expect(
      pipe.transform(
        {
          email: 'john@example.com',
          password: 'short',
        },
        { type: 'body', metatype: LoginDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
