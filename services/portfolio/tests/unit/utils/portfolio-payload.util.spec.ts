import { mapPortfolioWritePayload } from '../../../src/utils/portfolio-payload.util';
import { ContentFormat } from '../../../src/dto/create-portfolio-item.dto';

describe('mapPortfolioWritePayload', () => {
  it('maps featured and flat client marketing fields', () => {
    const data = mapPortfolioWritePayload({
      title: 'Case study',
      shortDescription: 'Short',
      fullDescription: 'Full',
      contentFormat: ContentFormat.MARKDOWN,
      featured: true,
      clientName: 'Acme',
      clientIndustry: 'Retail',
      clientWebsite: 'https://acme.test',
      clientTestimonial: {
        quote: 'Great',
        author: 'CEO',
        role: 'Founder',
        rating: 5,
        enabled: true,
      },
    });

    expect(data.featured).toBe(true);
    expect(data.clientName).toBe('Acme');
    expect(data.clientIndustry).toBe('Retail');
    expect(data.clientWebsite).toBe('https://acme.test');
    expect(data.clientTestimonial).toEqual({
      quote: 'Great',
      author: 'CEO',
      role: 'Founder',
      rating: 5,
      enabled: true,
    });
  });

  it('maps review role and rating from nested client testimonial', () => {
    const data = mapPortfolioWritePayload({
      title: 'Case study',
      shortDescription: 'Short',
      fullDescription: 'Full',
      contentFormat: ContentFormat.MARKDOWN,
      client: {
        name: 'Acme',
        testimonial: {
          quote: 'Nice',
          author: 'CTO',
          role: 'Head of Product',
          rating: 4,
          enabled: true,
        },
      },
    });

    expect(data.clientTestimonial).toEqual({
      quote: 'Nice',
      author: 'CTO',
      role: 'Head of Product',
      rating: 4,
      enabled: true,
    });
  });
});
