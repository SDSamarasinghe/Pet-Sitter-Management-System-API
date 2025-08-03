import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ApproveUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}
