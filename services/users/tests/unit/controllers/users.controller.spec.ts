import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../../../src/controllers/users.controller';
import { ProfileService } from '../../../src/services/profile.service';
import { PreferencesService } from '../../../src/services/preferences.service';
import { AvatarService } from '../../../src/services/avatar.service';
import { SessionsService } from '../../../src/services/sessions.service';
import { AccountService } from '../../../src/services/account.service';
import { TwoFactorService } from '../../../src/services/two-factor.service';
import { ActivityService } from '../../../src/services/activity.service';

describe('UsersController', () => {
  let controller: UsersController;
  let profileService: ProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: ProfileService,
          useValue: {
            getProfile: jest.fn(),
            updateProfile: jest.fn(),
          },
        },
        { provide: PreferencesService, useValue: {} },
        { provide: AvatarService, useValue: {} },
        { provide: SessionsService, useValue: {} },
        { provide: AccountService, useValue: {} },
        { provide: TwoFactorService, useValue: {} },
        { provide: ActivityService, useValue: {} },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    profileService = module.get<ProfileService>(ProfileService);
  });

  describe('getProfile', () => {
    it('should return the user profile', async () => {
      const mockProfile = { id: 'user1', email: 'test@example.com' };
      jest.spyOn(profileService, 'getProfile').mockResolvedValue(mockProfile as any);

      const result = await controller.getProfile('user1');
      expect(result).toEqual(mockProfile);
      expect(profileService.getProfile).toHaveBeenCalledWith('user1');
    });
  });

  describe('updateProfile', () => {
    it('should update and return the user profile', async () => {
      const mockDto = { firstName: 'Updated' };
      const mockUpdatedProfile = { id: 'user1', firstName: 'Updated' };
      jest.spyOn(profileService, 'updateProfile').mockResolvedValue(mockUpdatedProfile as any);

      const result = await controller.updateProfile('user1', mockDto);
      expect(result).toEqual(mockUpdatedProfile);
      expect(profileService.updateProfile).toHaveBeenCalledWith('user1', mockDto);
    });
  });
});
