import { AppService } from 'src/app.service';

describe('AppService', () => {
  it('returns hello message', () => {
    const service = new AppService();

    expect(service.getHello()).toBe('Hello World!');
  });
});
