import * as mocks from '../../src/decorators.mock';

describe('Decorator Mocks', () => {
  it('WriteOnly should return the descriptor', () => {
    const decorator = mocks.WriteOnly();
    const descriptor = { value: jest.fn() };
    expect(decorator({}, 'method', descriptor)).toBe(descriptor);
  });

  it('ReadOnly should return the descriptor', () => {
    const decorator = mocks.ReadOnly();
    const descriptor = { value: jest.fn() };
    expect(decorator({}, 'method', descriptor)).toBe(descriptor);
  });

  it('Idempotent should return the descriptor', () => {
    const decorator = mocks.Idempotent();
    const descriptor = { value: jest.fn() };
    expect(decorator({}, 'method', descriptor)).toBe(descriptor);
  });

  it('ApiStandardResponse should return the descriptor', () => {
    const decorator = mocks.ApiStandardResponse();
    const descriptor = { value: jest.fn() };
    expect(decorator({}, 'method', descriptor)).toBe(descriptor);
  });

  it('ApiPaginatedResponse should return the descriptor', () => {
    const decorator = mocks.ApiPaginatedResponse();
    const descriptor = { value: jest.fn() };
    expect(decorator({}, 'method', descriptor)).toBe(descriptor);
  });

  it('SuccessResponse should return the descriptor', () => {
    const decorator = mocks.SuccessResponse();
    const descriptor = { value: jest.fn() };
    expect(decorator({}, 'method', descriptor)).toBe(descriptor);
  });

  it('Public should return the descriptor', () => {
    const decorator = mocks.Public();
    const descriptor = { value: jest.fn() };
    expect(decorator({}, 'method', descriptor)).toBe(descriptor);
  });

  it('ActiveUser should not error when applied', () => {
    const decorator = mocks.ActiveUser();
    expect(() => decorator({}, 'method', 0)).not.toThrow();
  });
});
