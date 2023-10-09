import {
  Document, Model, Schema, model
} from 'mongoose';

export interface IBlog extends Document {
  url: string;
  headings: string;
  content: string;
  dominant_topic_keywords: string;
  dominant_topic: number;
  sentiment: string;
  published_year: string;
  top_10_terms: string;
  top_10_tf_scores: object
}

interface IBlogModel extends Model<IBlog> { }

const schema = new Schema({
  url: { type: String, required: true },
  headings: { type: String, required: true },
  content: { type: String, required: true },
  dominant_topic_keywords: { type: String, required: true },
  dominant_topic: { type: Number, required: true },
  sentiment: { type: String, required: true },
  published_year: { type: String, required: true },
  top_10_terms: { type: String, required: true },
  top_10_tf_scores: { type: Object, required: true },
});

export const Blogs: IBlogModel = model<IBlog, IBlogModel>('Blogs', schema);
