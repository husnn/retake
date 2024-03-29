import { CurrentUserDTO } from '@retake/shared';
import { Result } from '../base';
import { User } from '../entities';
import { UserRepository } from '../repositories';
import { generateUserId } from '../utils';
import { AuthFailureReason } from './errors';

export class AuthService {
  private userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  async signup(
    email: string,
    password: string,
    ip: string
  ): Promise<Result<CurrentUserDTO>> {
    try {
      const existing = await this.userRepository.findByEmail(email);
      if (existing)
        return Result.fail(null, AuthFailureReason.EMAIL_ALREADY_EXISTS);

      let user = new User({
        id: await generateUserId()(),
        dateCreated: new Date(),
        email,
        lastLogin: new Date(),
        lastLoginIP: ip
      });

      user.password = await User.hashPassword(password);
      user = await this.userRepository.create(user);

      return Result.ok(new CurrentUserDTO(user));
    } catch (err) {
      return Result.fail(err);
    }
  }

  async login(
    email: string,
    password: string,
    ip: string
  ): Promise<Result<CurrentUserDTO>> {
    try {
      const user = await this.userRepository.findByEmail(email, {
        select: ['password']
      });
      if (!user) return Result.fail(null, AuthFailureReason.USER_NOT_FOUND);

      const match = await User.verifyPassword(password, user.password);
      if (!match)
        return Result.fail(null, AuthFailureReason.INCORRECT_PASSWORD);

      delete user.password;

      this.userRepository.update({
        ...user,
        lastLogin: new Date(),
        lastLoginIP: ip
      });

      return Result.ok(new CurrentUserDTO(user));
    } catch (err) {
      return Result.fail(err);
    }
  }
}

export default AuthService;
