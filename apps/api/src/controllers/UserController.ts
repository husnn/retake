import { UserService } from '@retake/core';

class UserController {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }
}

export default UserController;
