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
  const { page = undefined } = req.query;
  const docsPerPage = 10;
  const currentPage = Number(page) || 1;

  const query = buildBlogSeachQuery((q as string));
  const totalResult = await Blogs.find(query).countDocuments();
  const blogs = await Blogs.find(query).skip(docsPerPage * currentPage).limit(docsPerPage);
  res.send({ blogs, currentPage, pages: Math.ceil(totalResult / docsPerPage) });
};

export const search = relogRequestHandler(searchWrapper);
