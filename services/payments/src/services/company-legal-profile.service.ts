import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import {
  isValidGstin,
  isValidPan,
  normalizeGstinOrNull,
  normalizePanOrNull,
} from '@nestlancer/common';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import {
  CreateCompanyLegalProfileDto,
  UpdateCompanyLegalProfileDto,
} from '../dto/company-legal-profile.dto';

function trimOrNull(value?: string | null): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** NL-BUG-PDF-013: reject free-text GSTIN/PAN that would print on tax invoices. */
function assertTaxIds(gstin?: string | null, pan?: string | null): void {
  if (gstin != null && String(gstin).trim() !== '' && !isValidGstin(gstin)) {
    throw new BadRequestException(
      'GSTIN must be a valid 15-character Indian GST identification number',
    );
  }
  if (pan != null && String(pan).trim() !== '' && !isValidPan(pan)) {
    throw new BadRequestException(
      'PAN must be a valid 10-character Indian permanent account number',
    );
  }
}

@Injectable()
export class CompanyLegalProfileService {
  private readonly logger = new Logger(CompanyLegalProfileService.name);
  private seedAttempted = false;

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly configService: ConfigService,
  ) {}

  /** One-time seed from legacy COMPANY_* env when table is empty. */
  async ensureSeededFromEnv(): Promise<void> {
    if (this.seedAttempted) return;
    this.seedAttempted = true;

    const count = await this.prismaRead.companyLegalProfile.count();
    if (count > 0) return;

    const legalName = this.configService.get<string>('COMPANY_LEGAL_NAME', '')?.trim() || '';
    const tradeName = this.configService.get<string>('COMPANY_NAME', '')?.trim() || '';
    const address = this.configService.get<string>('COMPANY_ADDRESS', '')?.trim() || '';
    const gstin = this.configService.get<string>('COMPANY_GST', '')?.trim() || '';
    const pan = this.configService.get<string>('COMPANY_PAN', '')?.trim() || '';
    const cin = this.configService.get<string>('COMPANY_CIN', '')?.trim() || '';
    const email = this.configService.get<string>('COMPANY_EMAIL', '')?.trim() || '';
    const phone = this.configService.get<string>('COMPANY_PHONE', '')?.trim() || '';
    const website = this.configService.get<string>('COMPANY_WEBSITE', '')?.trim() || '';
    const state = this.configService.get<string>('COMPANY_STATE', '')?.trim() || '';
    const stateCode = this.configService.get<string>('COMPANY_STATE_CODE', '')?.trim() || '';

    if (!legalName && !gstin && !address && !pan) {
      this.logger.warn(
        'No CompanyLegalProfile rows and no COMPANY_* legal env to seed from — PDFs will omit GSTIN/address until configured',
      );
      return;
    }

    await this.prismaWrite.companyLegalProfile.create({
      data: {
        label: 'Primary legal entity',
        legalName: legalName || null,
        tradeName: tradeName || null,
        address: address || null,
        state: state || null,
        stateCode: stateCode || null,
        gstin: gstin || null,
        pan: pan || null,
        cin: cin || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        isActive: true,
        isPrimary: true,
        sortOrder: 0,
      },
    });
    this.logger.log('Seeded CompanyLegalProfile from legacy COMPANY_* env');
  }

  async listAdmin() {
    await this.ensureSeededFromEnv();
    return this.prismaRead.companyLegalProfile.findMany({
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getPrimaryOrFirstActive() {
    await this.ensureSeededFromEnv();
    const primary = await this.prismaRead.companyLegalProfile.findFirst({
      where: { isActive: true, isPrimary: true },
    });
    if (primary) return primary;
    return this.prismaRead.companyLegalProfile.findFirst({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Branding for PDF generation. Legal fields are blank when unset (NL-BUG-PDF-001).
   * Trade/display name falls back to env only for masthead continuity.
   */
  async toCompanyBranding(): Promise<{
    name: string;
    legalName: string;
    address: string;
    state: string;
    stateCode: string;
    gst: string;
    pan: string;
    cin: string;
    email: string;
    phone: string;
    website: string;
  }> {
    const profile = await this.getPrimaryOrFirstActive();
    const envName = this.configService.get('COMPANY_NAME', 'Nestlancer') || 'Nestlancer';

    if (!profile) {
      return {
        name: envName,
        legalName: '',
        address: '',
        state: '',
        stateCode: '',
        gst: '',
        pan: '',
        cin: '',
        email: '',
        phone: '',
        website: '',
      };
    }

    return {
      name: profile.tradeName || profile.legalName || envName,
      legalName: profile.legalName || '',
      address: profile.address || '',
      state: profile.state || '',
      stateCode: profile.stateCode || '',
      // Render guard: never print invalid GSTIN/PAN that may already be stored.
      gst: normalizeGstinOrNull(profile.gstin) || '',
      pan: normalizePanOrNull(profile.pan) || '',
      cin: profile.cin || '',
      email: profile.email || '',
      phone: profile.phone || '',
      website: profile.website || '',
    };
  }

  async create(adminId: string, dto: CreateCompanyLegalProfileDto) {
    assertTaxIds(dto.gstin, dto.pan);

    if (dto.isPrimary) {
      await this.prismaWrite.companyLegalProfile.updateMany({
        where: { isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prismaWrite.companyLegalProfile.create({
      data: {
        label: dto.label.trim(),
        legalName: trimOrNull(dto.legalName),
        tradeName: trimOrNull(dto.tradeName),
        address: trimOrNull(dto.address),
        state: trimOrNull(dto.state),
        stateCode: trimOrNull(dto.stateCode),
        gstin: normalizeGstinOrNull(dto.gstin),
        pan: normalizePanOrNull(dto.pan),
        cin: trimOrNull(dto.cin)?.toUpperCase() ?? null,
        email: trimOrNull(dto.email),
        phone: trimOrNull(dto.phone),
        website: trimOrNull(dto.website),
        isActive: dto.isActive ?? true,
        isPrimary: dto.isPrimary ?? false,
        sortOrder: dto.sortOrder ?? 0,
        createdById: adminId,
        updatedById: adminId,
      },
    });
  }

  async update(adminId: string, id: string, dto: UpdateCompanyLegalProfileDto) {
    const existing = await this.prismaWrite.companyLegalProfile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Company legal profile not found');

    if (dto.gstin !== undefined) {
      assertTaxIds(dto.gstin, undefined);
    }
    if (dto.pan !== undefined) {
      assertTaxIds(undefined, dto.pan);
    }

    if (dto.isPrimary === true) {
      await this.prismaWrite.companyLegalProfile.updateMany({
        where: { isPrimary: true, NOT: { id } },
        data: { isPrimary: false },
      });
    }

    const data: Prisma.CompanyLegalProfileUpdateInput = {
      updatedBy: { connect: { id: adminId } },
    };

    if (dto.label !== undefined) data.label = dto.label.trim();
    if (dto.legalName !== undefined) data.legalName = trimOrNull(dto.legalName);
    if (dto.tradeName !== undefined) data.tradeName = trimOrNull(dto.tradeName);
    if (dto.address !== undefined) data.address = trimOrNull(dto.address);
    if (dto.state !== undefined) data.state = trimOrNull(dto.state);
    if (dto.stateCode !== undefined) data.stateCode = trimOrNull(dto.stateCode);
    if (dto.gstin !== undefined) data.gstin = normalizeGstinOrNull(dto.gstin);
    if (dto.pan !== undefined) data.pan = normalizePanOrNull(dto.pan);
    if (dto.cin !== undefined) data.cin = trimOrNull(dto.cin)?.toUpperCase() ?? null;
    if (dto.email !== undefined) data.email = trimOrNull(dto.email);
    if (dto.phone !== undefined) data.phone = trimOrNull(dto.phone);
    if (dto.website !== undefined) data.website = trimOrNull(dto.website);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.isPrimary !== undefined) data.isPrimary = dto.isPrimary;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    return this.prismaWrite.companyLegalProfile.update({ where: { id }, data });
  }

  /** Hard-delete — legal profiles are not referenced by payment FKs. */
  async remove(adminId: string, id: string) {
    const existing = await this.prismaWrite.companyLegalProfile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Company legal profile not found');

    await this.prismaWrite.companyLegalProfile.delete({ where: { id } });
    this.logger.log(`CompanyLegalProfile ${id} removed by admin ${adminId}`);
    return { id, deleted: true };
  }
}
