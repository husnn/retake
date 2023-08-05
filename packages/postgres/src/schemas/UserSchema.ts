import { User } from '@retake/core';
import { EntitySchema } from 'typeorm';

const UserSchema = new EntitySchema<User>({
  name: 'users',
  columns: {
    id: {
      type: 'text',
      primary: true
    },
    dateCreated: {
      type: 'timestamptz',
      name: 'date_created'
    },
    email: {
      type: 'text',
      name: 'email',
      unique: true
    },
    password: {
      type: 'text',
      name: 'password',
      select: false
    },
    firstName: {
      type: 'text',
      name: 'first_name',
      nullable: true
    },
    lastName: {
      type: 'text',
      name: 'last_name',
      nullable: true
    },
    lastLogin: {
      type: 'timestamptz',
      name: 'last_login',
      nullable: true
    },
    lastLoginIP: {
      type: 'text',
      name: 'last_login_ip',
      nullable: true
    }
  }
});

export default UserSchema;
