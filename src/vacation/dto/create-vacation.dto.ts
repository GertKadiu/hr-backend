import { IsString, IsEnum, IsOptional } from 'class-validator';
import { VacationType } from '../../schemas/vacation.schema';
import { Type } from 'class-transformer';

export class CreateVacationDto {
  @IsEnum(VacationType)
  type: VacationType;

  @IsString()
  @IsOptional()
  description: string;

  @Type(() => Date)
  @IsOptional()
  startDate: Date;

  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  userId: string;
}
