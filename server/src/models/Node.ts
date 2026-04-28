import mongoose, { Model, Document } from 'mongoose';
import type { INode } from '@shared/types';

export interface INodeDocument extends Omit<INode, '_id' | 'ownerId' | 'parentId'>, Document {
    _id:      mongoose.Types.ObjectId;
    ownerId:  mongoose.Types.ObjectId;
    parentId?: mongoose.Types.ObjectId | null;    
}

const nodeSchema = new mongoose.Schema<INodeDocument>({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,        
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
    },    
    x:      {type: Number},
    y:      {type: Number},
    inTrash: {type: Boolean},
    lastUpdate: {type: Date},   
});

// Ключевой индекс — запрос "все ноды юзера на этом уровне" будет мгновенным
nodeSchema.index({ ownerId: 1, parentId: 1 });

export const Node: Model<INodeDocument> =
    mongoose.models['Nodes'] ||
    mongoose.model<INodeDocument>('Nodes', nodeSchema);
