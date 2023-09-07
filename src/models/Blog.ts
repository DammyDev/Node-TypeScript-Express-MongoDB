import {
  Document, Model, Schema, model
} from 'mongoose';

export interface IBlog extends Document {
  url: string;
  headings: string;
  content: string;
  dominant_topic_keywords: string;
  sentiment: string;
  published_year: string;
}

interface IBlogModel extends Model<IBlog> { }

const schema = new Schema({
  url: { type: String, required: true },
  headings: { type: String, required: true },
  content: { type: String, required: true },
  dominant_topic_keywords: { type: String, required: true },
  sentiment: { type: String, required: true },
  published_year: { type: String, required: true },
});

export const Blogs: IBlogModel = model<IBlog, IBlogModel>('Blogs', schema);
