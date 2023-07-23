import Repository from './Repository';
import { User } from '../entities';

export interface UserRepository extends Repository<User> {
  findByEmail(
    email: string,
    opts?: { select: Array<keyof User> }
  ): Promise<User>;
}

export default UserRepository;
