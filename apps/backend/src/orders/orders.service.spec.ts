import { OrderItem } from './entities/order-item.entity';

describe('OrderItem entity', () => {
  it('should include organization_id', () => {
    const orderItem = new OrderItem();
    orderItem.organization_id = 'organization-1';

    expect(orderItem.organization_id).toBe('organization-1');
  });
});
