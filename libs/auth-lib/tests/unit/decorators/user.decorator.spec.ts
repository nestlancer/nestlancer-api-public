import { ActiveUser, CurrentUser } from '../../../src/decorators/user.decorator';

describe('User Decorators', () => {
  it('ActiveUser should be defined', () => {
    expect(ActiveUser).toBeDefined();
    expect(typeof ActiveUser).toBe('function');
  });

  it('CurrentUser should be defined as an alias', () => {
    expect(CurrentUser).toBeDefined();
    expect(CurrentUser).toBe(ActiveUser);
  });
});
