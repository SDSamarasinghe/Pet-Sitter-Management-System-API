import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type KeySecurityDocument = KeySecurity & Document;

@Schema({ timestamps: true })
export class KeySecurity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clientId: Types.ObjectId;

  // Lockbox
  @Prop({ required: true })
  lockboxCode: string;

  @Prop()
  lockboxLocation: string;

  // Alarm
  @Prop()
  alarmCompanyName: string;

  @Prop()
  alarmCompanyPhone: string;

  @Prop()
  alarmCodeToEnter: string;

  @Prop()
  alarmCodeToExit: string;

  // Additional Comments
  @Prop()
  additionalComments: string;

  // Access Permissions (checkboxes)
  @Prop({
    type: {
      landlord: { type: Boolean, default: false },
      buildingManagement: { type: Boolean, default: false },
      superintendent: { type: Boolean, default: false },
      housekeeper: { type: Boolean, default: false },
      neighbour: { type: Boolean, default: false },
      friend: { type: Boolean, default: false },
      family: { type: Boolean, default: false },
      none: { type: Boolean, default: true }
    },
    default: {
      landlord: false,
      buildingManagement: false,
      superintendent: false,
      housekeeper: false,
      neighbour: false,
      friend: false,
      family: false,
      none: true
    }
  })
  accessPermissions: {
    landlord: boolean;
    buildingManagement: boolean;
    superintendent: boolean;
    housekeeper: boolean;
    neighbour: boolean;
    friend: boolean;
    family: boolean;
    none: boolean;
  };

  // Names and phone numbers of all who have access
  @Prop()
  homeAccessList: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const KeySecuritySchema = SchemaFactory.createForClass(KeySecurity);
