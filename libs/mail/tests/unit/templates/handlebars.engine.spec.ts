import { renderTemplate } from '../../../src/templates/handlebars.engine';

describe('Handlebars Engine', () => {
  it('should replace variables in template string', () => {
    const template = 'Hello {{name}}, welcome to {{company}}!';
    const variables = { name: 'Alice', company: 'Nestlancer' };
    const result = renderTemplate(template, variables);
    expect(result).toBe('Hello Alice, welcome to Nestlancer!');
  });

  it('should ignore missing variables by leaving them empty', () => {
    const template = 'Hello {{name}}!';
    const variables = {};
    const result = renderTemplate(template, variables);
    expect(result).toBe('Hello !');
  });

  it('should correctly handle multiple occurrences of the same variable', () => {
    const template = '{{name}} is {{name}}';
    const variables = { name: 'Bob' };
    const result = renderTemplate(template, variables);
    expect(result).toBe('Bob is Bob');
  });
});
