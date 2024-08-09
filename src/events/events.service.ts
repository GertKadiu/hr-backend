import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event, PollOption } from '../common/schema/event.schema';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/common/enum/notification.enum';
import { User } from 'src/common/schema/user.schema';
import { VoteDto } from './dto/vote.dto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { Auth } from 'src/common/schema/auth.schema';
import { MailService } from 'src/mail/mail.service';
import {
  validateData,
  validatePollData,
  populateParticipants,
  validateDate,
} from './events.utils';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<Event>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Auth.name) private authModel: Model<Auth>,
    private notificationService: NotificationService,
    private readonly firebaseService: FirebaseService,
    private readonly mailService: MailService,
  ) {}

  async create(
    files: Express.Multer.File[],
    createEventDto: CreateEventDto,
  ): Promise<Event> {
    try {
      let eventPhotos: string[] = [];
      if (files && files.length > 0) {
        eventPhotos = await Promise.all(
          files.map(async (file) => {
            return await this.firebaseService.uploadFile(file, 'eventPhoto');
          }),
        );
      }
      const createdEvent = new this.eventModel({
        ...createEventDto,
        photo: eventPhotos,
      });

      if (!createdEvent) {
        throw new InternalServerErrorException('Event could not be created');
      }

      if (
        !createdEvent.participants ||
        createdEvent.participants.length === 0
      ) {
        createdEvent.participants = await populateParticipants();
      }
      if (!createdEvent.endDate) {
        createdEvent.endDate = createdEvent.startDate;
        validateDate(createdEvent.startDate, createdEvent.endDate);
      }

      if (createdEvent.poll) {
        validatePollData(createdEvent.poll);
        createdEvent.poll.options.forEach((opt) => {
          opt.votes = 0;
          opt.voters = [];
        });
      }
      await this.notificationService.createNotification(
        'Event Created',
        `Event ${createdEvent.title} has been created`,
        NotificationType.EVENT,
        createdEvent._id as Types.ObjectId,
        new Date(),
      );
      await this.mailService.sendMail({
        to: createdEvent.participants,
        subject: `${createdEvent.title} - ${createdEvent.type}`,
        template: './event',
        context: {
          name: `${createdEvent.description}`,
        },
      });
      return await createdEvent.save();
    } catch (error) {
      throw new ConflictException(error);
    }
  }

  async findAll(search:string): Promise<Event[]> {
    const filter : FilterQuery<Event> = {};
    if(search){
      filter.title = { $regex: search, $options: 'i' };
    }
    try {
      return this.eventModel.find(filter).where('isDeleted').equals(false);
    } catch (error) {
      throw new ConflictException(error);
    }
  }

  async findOne(id: string): Promise<Event> {
    try {
      const event = await this.eventModel.findById(id);
      if (!event || event.isDeleted) {
        throw new NotFoundException(`Event with id ${id} not found`);
      }
      return event;
    } catch (error) {
      throw new ConflictException(error);
    }
  }

  async update(
    id: string,
    updateEventDto: UpdateEventDto,
    photos?: Express.Multer.File[],
  ): Promise<Event> {
    try {
      let eventPhotos: string[] = [];
      if (photos) {
        eventPhotos = await Promise.all(
          photos.map(async (photo) => {
            return await this.firebaseService.uploadFile(photo, 'eventPhoto');
          }),
        );
      }
      const existingEvent = await this.eventModel.findById(id);
      if (!existingEvent) {
        throw new NotFoundException(`Event with id ${id} not found`);
      }

      if (!existingEvent.poll && updateEventDto.poll) {
        validatePollData(updateEventDto.poll);
        updateEventDto.poll.options = updateEventDto.poll.options.map(
          (opt) => ({
            ...opt,
            votes: 0,
            voters: [],
          }),
        );
      }

      const updatedEvent = await this.eventModel.findByIdAndUpdate(
        id,
        { ...updateEventDto, photo: eventPhotos },
        { new: true, runValidators: true },
      );

      validateDate(updatedEvent.startDate, updatedEvent.endDate);
      await this.notificationService.createNotification(
        'Event Updated',
        `Event ${updatedEvent.title} has been updated`,
        NotificationType.EVENT,
        updatedEvent._id as Types.ObjectId,
        new Date(),
      );

      return updatedEvent;
    } catch (error) {
      throw new ConflictException(error);
    }
  }
  async remove(id: string): Promise<void> {
    try {
      const result = await this.eventModel.findById(id);
      if (!result) {
        throw new NotFoundException(`Event with id ${id} not found`);
      }
      await this.eventModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true },
      );
      await this.notificationService.createNotification(
        'Event Deleted',
        `Event ${result.title} has been deleted`,
        NotificationType.EVENT,
        result._id as Types.ObjectId,
        new Date(),
      );
    } catch (error) {
      throw new ConflictException(error);
    }
  }
}
