import { Schema, model, type InferSchemaType } from 'mongoose';

export type WorkspaceRole = 'owner' | 'editor' | 'viewer';

const workspaceMemberSchema = new Schema(
  {
    userId: { type: String, required: true },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], required: true },
  },
  { _id: false },
);

const workspaceSchema = new Schema(
  {
    workspaceId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    ownerId: { type: String, required: true, index: true },
    members: { type: [workspaceMemberSchema], required: true },
  },
  { timestamps: true },
);

workspaceSchema.index({ 'members.userId': 1 });

export type WorkspaceRecord = InferSchemaType<typeof workspaceSchema>;
export const WorkspaceModel = model('Workspace', workspaceSchema);
