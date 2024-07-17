import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../common/schema/user.schema';
import mongoose from 'mongoose';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private userModel: mongoose.Model<User>,
  ) {}
  async findAll(): Promise<User[]> {
    try {
      const users = await this.userModel.find().populate('userId');
      console.log(users);
      return users;
    } catch (err) {
      throw new ConflictException(err);
    }
  }

  async findOne(id: string): Promise<User | null> {
    try {
      const user = await this.userModel.findById(id).populate('userId');

      return user;
    } catch (err) {
      throw new ConflictException(err);
    }
  }

  async updateUser(updateUserDto: UpdateUserDto, id: string): Promise<User> {
    try {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        id,
        updateUserDto,
        { new: true },
      );
      return updatedUser;
    } catch (err) {
      throw new ConflictException(err);
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await this.userModel.findByIdAndDelete(id);
    } catch (err) {
      throw new ConflictException(err);
    }
  }
}
