import { CreatePortfolioItemDto } from '../dto/create-portfolio-item.dto';
import { UpdatePortfolioItemDto } from '../dto/update-portfolio-item.dto';
import { Prisma } from '@prisma/client';

type PortfolioWriteInput = (CreatePortfolioItemDto | UpdatePortfolioItemDto) & {
  clientName?: string;
  clientIndustry?: string;
  clientWebsite?: string;
  clientTestimonial?: unknown;
  featured?: boolean;
};

export function mapPortfolioWritePayload(
  dto: CreatePortfolioItemDto | UpdatePortfolioItemDto,
): Prisma.PortfolioItemUncheckedUpdateInput {
  const input = dto as PortfolioWriteInput;
  const {
    categoryId,
    imageIds: _imageIds,
    tags,
    client,
    projectDetails,
    links,
    seo,
    videoId,
    clientName,
    clientIndustry,
    clientWebsite,
    clientTestimonial,
    featured,
    ...rest
  } = input;

  const data: Prisma.PortfolioItemUncheckedUpdateInput = {};

  if (rest.title !== undefined) data.title = rest.title;
  if (rest.slug !== undefined) data.slug = rest.slug;
  if (rest.shortDescription !== undefined) data.shortDescription = rest.shortDescription;
  if (rest.fullDescription !== undefined) data.fullDescription = rest.fullDescription;
  if (rest.contentFormat !== undefined) {
    data.contentFormat = String(rest.contentFormat).toLowerCase();
  }

  if (categoryId !== undefined) data.categoryId = categoryId;
  if (tags !== undefined) data.tags = tags.map((t) => t.toLowerCase());
  if (projectDetails !== undefined) data.projectDetails = projectDetails as Prisma.InputJsonValue;
  if (links !== undefined) data.links = links as Prisma.InputJsonValue;
  if (seo !== undefined) data.seo = seo as Prisma.InputJsonValue;
  if (videoId !== undefined) data.videoId = videoId;
  if (featured !== undefined) data.featured = featured;
  if (rest.thumbnailId !== undefined) data.thumbnailId = rest.thumbnailId as string;

  if (client?.name) data.clientName = client.name;
  if (clientName !== undefined) data.clientName = clientName;
  if (client?.logoId) data.clientLogo = client.logoId;
  if (client?.industry) data.clientIndustry = client.industry;
  if (clientIndustry !== undefined) data.clientIndustry = clientIndustry;
  if (client?.website) data.clientWebsite = client.website;
  if (clientWebsite !== undefined) data.clientWebsite = clientWebsite;
  if (client?.testimonial) {
    data.clientTestimonial = client.testimonial as Prisma.InputJsonValue;
  }
  if (clientTestimonial !== undefined) {
    data.clientTestimonial = clientTestimonial as Prisma.InputJsonValue;
  }

  return data;
}
