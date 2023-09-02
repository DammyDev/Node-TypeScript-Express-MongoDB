import { RequestHandler } from 'express';
import { relogRequestHandler } from '../../middleware/request-middleware';
import { Blogs } from '../../models/Blog';

const buildBlogSeachQuery = (searchTerm: string) => {
  const query: any = {};
  if (searchTerm) {
    query.heading_texts = new RegExp(`.*${searchTerm}.*`, 'i');
  }
  // if (searchTerm) {
  //   query.body = new RegExp(`.*${searchTerm}.*`, 'i');
  // }

  return query;
};

const searchWrapper: RequestHandler = async (req, res) => {
  const { q = undefined } = req.query;

  const query = buildBlogSeachQuery((q as string));
  let blogs = await Blogs.find(query);
  
 // Truncate the body to the first 50 characters
 blogs = blogs.map((blog:any) => ({
  ...blog._doc,
  body: blog.body.substring(0, 200)
}));

  res.send({ blogs });
};

export const search = relogRequestHandler(searchWrapper);
