import { RequestHandler } from 'express';
import { relogRequestHandler } from '../../middleware/request-middleware';
import { Blogs } from '../../models/Blog';

const buildBlogSeachQuery = (searchTerm: string) => {
  const query: any = {};
  if (searchTerm) {
    query.heading_texts = new RegExp(`.*${searchTerm}.*`, 'i');
  }
  if (searchTerm) {
    query.body = new RegExp(`.*${searchTerm}.*`, 'i');
  }

  return query;
};

const searchWrapper: RequestHandler = async (req, res) => {
  const { q = undefined } = req.query;

  const query = buildBlogSeachQuery((q as string));
  const blogs = await Blogs.find(query);
  res.send({ blogs });
};

export const search = relogRequestHandler(searchWrapper);
