import { Roles } from '../../../src/decorators/roles.decorator';
import { ROLES_KEY } from '../../../src/constants';

describe('Roles Re-export', () => {
  it('should be defined', () => {
    expect(Roles).toBeDefined();
    expect(typeof Roles).toBe('function');
  });

  it('should export ROLES_KEY', () => {
    expect(ROLES_KEY).toBeDefined();
  });
});
