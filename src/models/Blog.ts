import {
  Document, Model, Schema, model
} from 'mongoose';

export interface IBlog extends Document {
  url: string;
  body: string;
  // eslint-disable-next-line camelcase
  heading_texts: string;
}

interface IBlogModel extends Model<IBlog> { }

const schema = new Schema({
  url: { type: String, required: true },
  body: { type: String, required: true },
  heading_texts: { type: String, required: true },
});

export const Blogs: IBlogModel = model<IBlog, IBlogModel>('Blogs', schema);
