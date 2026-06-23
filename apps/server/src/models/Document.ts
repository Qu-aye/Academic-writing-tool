import { Schema, model, type InferSchemaType } from 'mongoose';

const documentSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },
    workspaceId: { type: String, index: true },
    title: { type: String, required: true },
    bodyHtml: { type: String, required: true },
    citationStyle: { type: String, default: 'harvard-ctr', required: true },
    citations: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
);

documentSchema.index({ ownerId: 1, updatedAt: -1 });
documentSchema.index({ workspaceId: 1, updatedAt: -1 });

export type DocumentRecord = InferSchemaType<typeof documentSchema>;
export const DocumentModel = model('Document', documentSchema);
