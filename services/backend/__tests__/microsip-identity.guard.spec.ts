import { BadRequestException } from '@nestjs/common';
import { rejectMicrosipIdentityFields } from '../src/catalog/microsip-import/microsip-identity.guard';

describe('normal catalog write protection', () => {
  it.each(['microsip_company', 'microsip_external_id'])(
    'rejects import-owned field %s in a normal write',
    (field) => {
      expect(() =>
        rejectMicrosipIdentityFields({ name: 'Tomato', [field]: 'pilot' }),
      ).toThrow(BadRequestException);
    },
  );

  it('keeps established public fields available', () => {
    expect(() =>
      rejectMicrosipIdentityFields({ name: 'Tomato', stock: 4, images: [] }),
    ).not.toThrow();
  });
});
