import { BadRequestException } from '@nestjs/common';

export function rejectMicrosipIdentityFields(value: object): void {
  if (
    Object.prototype.hasOwnProperty.call(value, 'microsip_company') ||
    Object.prototype.hasOwnProperty.call(value, 'microsip_external_id')
  ) {
    throw new BadRequestException(
      'Microsip identity is managed by catalog import',
    );
  }
}
