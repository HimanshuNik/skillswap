import { userRepository, type SafeUser } from '../repositories/user.repository.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken, generateResetToken, hashResetToken } from '../utils/tokens.js';
import { ConflictError, UnauthorizedError, ForbiddenError, AppError, HttpStatusCode } from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { platformSettingRepository } from '../repositories/platformSetting.repository.js';
import { emailService } from './email.service.js';
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  DeleteAccountInput,
} from '../validators/auth.validator.js';

export interface AuthResult {
  user: SafeUser;
  token: string;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResult> {
    const regEnabled = await platformSettingRepository.get('registration_enabled');
    if (regEnabled === 'false') {
      throw new ForbiddenError('New user registrations are currently disabled by platform administrators');
    }

    const existingEmail = await userRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new ConflictError('An account with this email address already exists');
    }

    const existingUsername = await userRepository.findByUsername(input.username);
    if (existingUsername) {
      throw new ConflictError('This username is already taken');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await userRepository.createUser({
      name: input.name,
      username: input.username,
      email: input.email,
      passwordHash,
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    logger.info({ userId: user.id, email: user.email }, 'User registered successfully');

    // Asynchronously enqueue welcome email
    emailService.enqueue({
      to: user.email,
      toName: user.name,
      userId: user.id,
      template: 'WELCOME',
      subject: 'Welcome to SkillSwap! 🎉',
      payload: { name: user.name, actionUrl: `${env.CLIENT_URL}/discover` },
    }).catch((err) => logger.error({ err }, 'Failed to enqueue welcome email'));

    return {
      user: userRepository.toSafeUser(user),
      token,
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await userRepository.findByEmailOrUsername(input.email);
    if (!user) {
      // Generic error message to prevent user enumeration
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.isActive === false) {
      throw new UnauthorizedError('This account has been deactivated. Please contact support.');
    }

    if (user.isSuspended) {
      throw new ForbiddenError(
        user.suspendedReason
          ? `Your account has been suspended: ${user.suspendedReason}`
          : 'Your account has been suspended by an administrator'
      );
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    logger.info({ userId: user.id }, 'User logged in successfully');

    return {
      user: userRepository.toSafeUser(user),
      token,
    };
  }

  async getMe(userId: number): Promise<SafeUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    return userRepository.toSafeUser(user);
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
    const user = await userRepository.findByEmail(input.email);

    if (user) {
      const { rawToken, tokenHash, expiresAt } = generateResetToken();
      await userRepository.saveResetToken(user.id, tokenHash, expiresAt);

      const resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;

      // Enqueue password reset email
      emailService.enqueue({
        to: user.email,
        toName: user.name,
        userId: user.id,
        template: 'PASSWORD_RESET',
        subject: 'Reset Your SkillSwap Password',
        payload: { name: user.name, resetUrl },
        bypassPreferences: true,
      }).catch((err) => logger.error({ err }, 'Failed to enqueue password reset email'));

      // In development mode without an email server configured, emit the link exclusively to the logger
      if (env.NODE_ENV !== 'production') {
        logger.info(
          {
            email: user.email,
            resetUrl,
          },
          '🔑 [DEV] Password reset link generated (Never returned in API response)'
        );
      }
    }

    // Always return constant message to prevent email enumeration
    return {
      message: 'If an account exists with that email address, a password reset link has been dispatched.',
    };
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const tokenHash = hashResetToken(input.token);
    const user = await userRepository.findByResetTokenHash(tokenHash);

    if (!user || !user.passwordResetExpiresAt) {
      throw new AppError('Invalid or expired password reset token', HttpStatusCode.BAD_REQUEST);
    }

    const expiresAt = new Date(user.passwordResetExpiresAt).getTime();
    if (expiresAt < Date.now()) {
      await userRepository.clearResetToken(user.id);
      throw new AppError('Password reset token has expired. Please request a new one.', HttpStatusCode.BAD_REQUEST);
    }

    const newPasswordHash = await hashPassword(input.password);
    await userRepository.updatePassword(user.id, newPasswordHash);

    logger.info({ userId: user.id }, 'Password reset completed successfully');

    return {
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  }

  async changePassword(userId: number, input: ChangePasswordInput): Promise<{ message: string }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const isValid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AppError('Incorrect current password', HttpStatusCode.BAD_REQUEST);
    }

    const newPasswordHash = await hashPassword(input.newPassword);
    await userRepository.updatePassword(user.id, newPasswordHash);

    logger.info({ userId }, 'User changed password successfully');
    return {
      message: 'Password updated successfully',
    };
  }

  async deleteAccount(userId: number, input: DeleteAccountInput): Promise<{ message: string }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Incorrect password. Account deletion aborted.', HttpStatusCode.BAD_REQUEST);
    }

    await userRepository.softDelete(userId);
    logger.info({ userId }, 'User soft-deleted their account');
    return {
      message: 'Account deactivated successfully',
    };
  }
}

export const authService = new AuthService();

