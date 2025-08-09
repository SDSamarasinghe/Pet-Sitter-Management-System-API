import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KeySecurityController } from './key-security.controller';
import { KeySecurityService } from './key-security.service';
import { KeySecurity, KeySecuritySchema } from './schemas/key-security.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: KeySecurity.name, schema: KeySecuritySchema },
    ]),
  ],
  controllers: [KeySecurityController],
  providers: [KeySecurityService],
  exports: [KeySecurityService],
})
export class KeySecurityModule {}
