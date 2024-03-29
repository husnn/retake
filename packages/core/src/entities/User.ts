import bcrypt from 'bcryptjs';

export class User {
  id: string;
  dateCreated: Date;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  lastLogin?: Date;
  lastLoginIP?: string;

  constructor(data: Partial<User>) {
    Object.assign(this, data);
  }

  static async hashPassword(password: string) {
    return bcrypt.hash(password, 10 || process.env.PASSWORD_SALT_ROUNDS);
  }

  static async verifyPassword(provided: string, actual: string) {
    return bcrypt.compare(provided, actual);
  }
}

export default User;
